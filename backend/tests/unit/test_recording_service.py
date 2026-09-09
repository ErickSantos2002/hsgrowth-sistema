"""
Processamento da gravação: baixar do Daily e guardar no bucket.

O arquivo viaja em blocos e é montado no bucket — o resultado é um vídeo
único, igual a qualquer outro. Isso permite guardar uma gravação de 1 hora
(500 MB ou mais) sem que o servidor precise segurá-la inteira na memória.

Depois de guardada, a cópia no Daily é apagada: lá o arquivo fica para sempre
e cobra armazenamento, o que sairia ~30x mais caro que o nosso bucket.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.services.recording_service import donos_da_reuniao, processar_gravacao


class _StreamFalso:
    """Simula httpx.stream(): entrega o arquivo em blocos, como na vida real."""

    def __init__(self, tamanho=1024, ok=True, bloco=8192):
        self.status_code = 200 if ok else 500
        self._tamanho = tamanho
        self._bloco = bloco
        self.headers = {"content-length": str(tamanho)}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def iter_bytes(self, chunk_size=None):
        restante = self._tamanho
        while restante > 0:
            pedaco = min(self._bloco, restante)
            yield b"x" * pedaco
            restante -= pedaco


@pytest.fixture
def task(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Apresentação de Proposta",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        daily_room_name="hsg-1",
        due_date=datetime(2026, 9, 10, 14, 0),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture(autouse=True)
def sessao_do_teste(db, monkeypatch):
    """
    O serviço roda em segundo plano e abre a própria sessão, fechando no fim —
    correto em produção. No teste a sessão é a do banco de teste, e fechá-la
    invalidaria os objetos que a asserção ainda vai consultar.
    """
    class _SessaoQueNaoFecha:
        def __init__(self, real):
            self._real = real

        def __getattr__(self, nome):
            return getattr(self._real, nome)

        def close(self):
            pass

    monkeypatch.setattr(
        "app.services.recording_service.SessionLocal", lambda: _SessaoQueNaoFecha(db)
    )


class TestFluxoNormal:

    def test_baixa_e_guarda_no_bucket(self, db, task):
        upload = MagicMock(return_value=5 * 1024 * 1024)

        with patch("httpx.stream", return_value=_StreamFalso(5 * 1024 * 1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", upload), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4",
                duration=1800, recording_id="rec-1",
            )

        db.refresh(task)
        assert task.recording_status == "ready"
        assert task.recording_key
        assert task.recording_duration_seconds == 1800
        assert task.recording_ready_at is not None
        upload.assert_called_once()

    def test_nome_do_arquivo_leva_o_titulo(self, db, task):
        """Para achar a gravação no bucket pelo assunto (seção 15.11)."""
        upload = MagicMock(return_value=1024)

        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", upload), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        chave = upload.call_args.args[1]
        assert "apresentacao-de-proposta" in chave
        assert str(task.id) in chave


class TestArquivoGrande:
    """
    Com envio em partes, tamanho deixou de ser problema. Uma reunião de 1h
    (500 MB ou mais) é o caso comum, não a exceção.
    """

    def test_gravacao_grande_e_guardada_normalmente(self, db, task):
        upload = MagicMock(return_value=700 * 1024 * 1024)

        with patch("httpx.stream", return_value=_StreamFalso(700 * 1024 * 1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", upload), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/grande.mp4",
                duration=3600, recording_id="rec-1",
            )

        db.refresh(task)
        assert task.recording_status == "ready"
        assert task.recording_key
        upload.assert_called_once()

    def test_nao_carrega_o_arquivo_inteiro_na_memoria(self, db, task):
        """O conteúdo precisa chegar como gerador, não como um bloco só."""
        recebido = {}

        def capturar(blocos, chave, content_type="video/mp4"):
            recebido["e_gerador"] = not isinstance(blocos, (bytes, bytearray, str))
            return sum(len(b) for b in blocos)

        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", capturar), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        assert recebido["e_gerador"] is True


class TestLimpezaNoDaily:
    """
    O Daily guarda a gravação para sempre e cobra armazenamento. Depois de
    copiar para o nosso bucket, o arquivo lá não serve para nada — e pagar
    dois armazenamentos pelo mesmo vídeo sairia bem mais caro.
    """

    def test_apaga_do_daily_apos_guardar(self, db, task):
        apagar = MagicMock()

        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", return_value=1024), \
             patch("app.services.daily_service.DailyService.apagar_gravacao", apagar):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        apagar.assert_called_once_with("rec-1")

    def test_nao_apaga_se_o_envio_falhou(self, db, task):
        """Enquanto não houver cópia nossa, o arquivo do Daily é o único que existe."""
        apagar = MagicMock()

        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes",
                   side_effect=ValueError("R2 fora do ar")), \
             patch("app.services.daily_service.DailyService.apagar_gravacao", apagar):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        apagar.assert_not_called()
        db.refresh(task)
        assert task.recording_status == "failed"

    def test_falha_ao_apagar_nao_invalida_a_gravacao(self, db, task):
        """A cópia já está no nosso bucket; sobra no Daily é problema menor."""
        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", return_value=1024), \
             patch("app.services.daily_service.DailyService.apagar_gravacao",
                   side_effect=Exception("indisponível")):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        db.refresh(task)
        assert task.recording_status == "ready"


class TestFalhas:

    def test_download_falho_registra_o_erro(self, db, task):
        with patch("httpx.stream", return_value=_StreamFalso(ok=False)):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        db.refresh(task)
        assert task.recording_status == "failed"
        assert task.recording_error

    def test_falha_no_bucket_registra_o_erro(self, db, task):
        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes",
                   side_effect=ValueError("R2 indisponível")), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        db.refresh(task)
        assert task.recording_status == "failed"
        assert "R2" in task.recording_error

    def test_tarefa_inexistente_nao_quebra(self, db):
        """Chamado em segundo plano: exceção aqui não tem quem trate."""
        processar_gravacao(task_id=99999999, download_url="https://daily/g.mp4")

    def test_gravacao_ja_processada_nao_repete(self, db, task):
        task.recording_status = "ready"
        task.recording_key = "2026/09/ja-existe.mp4"
        db.commit()

        upload = MagicMock()
        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", upload), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        upload.assert_not_called()
        db.refresh(task)
        assert task.recording_key == "2026/09/ja-existe.mp4"


class TestDonosDaReuniao:
    """
    Dono é quem tem vínculo com o negócio: o SDR agenda e vincula o vendedor,
    e os dois precisam saber que a gravação ficou pronta.
    """

    def test_inclui_vendedor_e_sdr_do_card(
        self, db, task, test_card, test_salesperson_user, test_sdr_user
    ):
        test_card.assigned_to_id = test_salesperson_user.id
        test_card.sdr_id = test_sdr_user.id
        db.commit()

        donos = donos_da_reuniao(db, task)

        assert test_salesperson_user.id in donos
        assert test_sdr_user.id in donos

    def test_inclui_o_responsavel_pela_tarefa(self, db, task, test_card, test_manager_user):
        test_card.assigned_to_id = None
        test_card.sdr_id = None
        task.assigned_to_id = test_manager_user.id
        db.commit()

        assert test_manager_user.id in donos_da_reuniao(db, task)

    def test_nao_repete_a_mesma_pessoa(self, db, task, test_card, test_salesperson_user):
        test_card.assigned_to_id = test_salesperson_user.id
        test_card.sdr_id = test_salesperson_user.id
        task.assigned_to_id = test_salesperson_user.id
        db.commit()

        donos = donos_da_reuniao(db, task)

        assert donos.count(test_salesperson_user.id) == 1


class TestNotificacoes:

    def test_avisa_os_donos_quando_fica_pronta(self, db, task, test_card, test_salesperson_user):
        test_card.assigned_to_id = test_salesperson_user.id
        db.commit()

        with patch("httpx.stream", return_value=_StreamFalso(1024)), \
             patch("app.services.storage_service.storage_service.upload_em_partes", return_value=1024), \
             patch("app.services.daily_service.DailyService.apagar_gravacao"):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        from app.models.notification import Notification
        avisos = db.query(Notification).filter(
            Notification.user_id == test_salesperson_user.id
        ).all()
        assert any("grava" in ((n.title or "") + (n.message or "")).lower() for n in avisos)

    def test_falha_avisa_tambem_os_admins(self, db, task, test_admin_user):
        with patch("httpx.stream", return_value=_StreamFalso(ok=False)):
            processar_gravacao(
                task_id=task.id, download_url="https://daily/g.mp4", recording_id="rec-1"
            )

        from app.models.notification import Notification
        avisos = db.query(Notification).filter(
            Notification.user_id == test_admin_user.id
        ).all()
        assert len(avisos) >= 1
