"""
A régua da consultoria — 26 critérios, peso e rubrica de três níveis.

GERADO por `scripts/extrair_criterios.py` a partir de
`Documentação/Avaliacao_Calls_HealthSafety_alinhada_a_matriz.xlsm`.
Não editar à mão: mudou a régua, rode o script de novo e suba a VERSAO.

A versão fica gravada em cada avaliação. Sem isso, mudar um peso reescreveria
o passado: uma reunião avaliada em setembro apareceria com outra nota em
novembro, e ninguém saberia por quê.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Criterio:
    id: str
    bloco: str
    titulo: str
    peso: float
    rubrica: tuple  # textos das notas 0, 1 e 2


@dataclass(frozen=True)
class Faixa:
    minimo: float
    veredito: str


VERSAO = "2026-09"

BLOCOS = ("Abertura", "Diagnóstico", "Demonstração", "Fechamento")

# Abaixo disto a reunião não recebe score comparável: transcrição curta ou
# parcial puxa a nota para baixo por falta de conversa, não por falta de
# técnica. Na planilha da consultoria, uma call de 9 minutos ficou assim.
COBERTURA_MINIMA = 0.70

VEREDITO_PARCIAL = "Call parcial — não comparar"


CRITERIOS: tuple = (
    Criterio(
        id='A1',
        bloco='Abertura',
        titulo='Apresentação do(a) vendedor(a) + pitch de autoridade',
        peso=3.0,
        rubrica=(
            'Não se apresenta nem contextualiza a Health and Safety.',
            'Apresenta pessoa ou empresa, mas de forma longa, genérica ou sem prova de autoridade.',
            'Apresenta-se de forma breve e usa prova de autoridade relevante, sem antecipar a demonstração.',
        ),
    ),
    Criterio(
        id='A2',
        bloco='Abertura',
        titulo='Agenda e contrato da conversa',
        peso=3.0,
        rubrica=(
            'Não combina agenda, duração ou objetivo da reunião.',
            'Explica parcialmente o fluxo, sem validar o acordo com o lead.',
            'Combina tempo e agenda: diagnóstico, demonstração, preço e próximos passos; obtém concordância.',
        ),
    ),
    Criterio(
        id='A3',
        bloco='Abertura',
        titulo='Mapeamento de stakeholders',
        peso=4.0,
        rubrica=(
            'Não identifica papéis nem participantes da decisão.',
            'Identifica participantes ou decisor parcialmente ou apenas no fim.',
            'Mapeia papéis presentes, decisor, influenciadores e eventual validação técnica no início.',
        ),
    ),
    Criterio(
        id='D1',
        bloco='Diagnóstico',
        titulo='Situação | Contexto do SDR, gatilho e processo atual',
        peso=5.0,
        rubrica=(
            'Ignora o contexto prévio e começa a apresentar o produto.',
            'Confirma apenas parte do contexto ou entende o processo superficialmente.',
            'Confirma contexto e gatilho, evita repetição e entende o fluxo atual ou o cenário de implantação.',
        ),
    ),
    Criterio(
        id='D2',
        bloco='Diagnóstico',
        titulo='Situação | Histórico, escala e cobertura',
        peso=5.0,
        rubrica=(
            'Não levanta histórico nem dimensão da operação.',
            'Obtém volume, unidades ou histórico, mas deixa lacunas relevantes.',
            'Mapeia histórico, efetivo, unidades, pontos, picos e abrangência da testagem.',
        ),
    ),
    Criterio(
        id='D3',
        bloco='Diagnóstico',
        titulo='Situação | Infraestrutura, integrações e governança',
        peso=5.0,
        rubrica=(
            'Não entende ambiente, sistemas ou responsáveis pelo processo.',
            'Levanta parte da infraestrutura ou da governança, sem fechar requisitos.',
            'Entende acesso, conectividade, integrações, responsáveis, alertas, contraprova e acesso aos dados.',
        ),
    ),
    Criterio(
        id='D4',
        bloco='Diagnóstico',
        titulo='Dor | Gargalo operacional',
        peso=4.0,
        rubrica=(
            'Não investiga a fricção do processo atual.',
            'Identifica um incômodo, mas não aprofunda frequência, esforço ou consequência.',
            'Identifica o principal gargalo e aprofunda tempo, mão de obra, filas, cobertura ou calibração.',
        ),
    ),
    Criterio(
        id='D5',
        bloco='Diagnóstico',
        titulo='Dor | Confiabilidade, controle e visibilidade',
        peso=4.0,
        rubrica=(
            'Não explora falhas de controle ou rastreabilidade.',
            'Reconhece uma fragilidade, mas sem investigar como ocorre ou quem é afetado.',
            'Explora identificação, fraude, registros, cobertura e dificuldade de recuperar evidências.',
        ),
    ),
    Criterio(
        id='D6',
        bloco='Diagnóstico',
        titulo='Impacto | Segurança',
        peso=5.0,
        rubrica=(
            'Não conecta a dor a risco para pessoas ou operação.',
            'Menciona risco de forma genérica, sem consequência concreta.',
            'Conecta a falha a incidentes, quase acidentes, terceiros ou continuidade operacional.',
        ),
    ),
    Criterio(
        id='D7',
        bloco='Diagnóstico',
        titulo='Impacto | Produtividade, custo e exposição',
        peso=5.0,
        rubrica=(
            'Não explora consequências operacionais, financeiras ou de auditoria.',
            'Obtém impactos qualitativos, mas sem dimensionar esforço ou exposição.',
            'Quantifica ou torna concreto o efeito em tempo, equipe, filas, custo, auditoria ou risco jurídico.',
        ),
    ),
    Criterio(
        id='D8',
        bloco='Diagnóstico',
        titulo='Síntese do diagnóstico',
        peso=7.0,
        rubrica=(
            'Entra na demonstração sem resumir o que entendeu.',
            'Retoma parte do cenário, mas não conecta dor, impacto e escala ou não valida.',
            'Resume dor, impacto e escala nas palavras do cliente e confirma a prioridade antes da demo.',
        ),
    ),
    Criterio(
        id='M1',
        bloco='Demonstração',
        titulo='Ponte diagnóstico → produto',
        peso=3.0,
        rubrica=(
            'Abre o deck e inicia um tour genérico.',
            'Retoma o cenário, mas não prioriza o que será mostrado nem cria espaço para interação.',
            'Abre o deck apenas aqui, prioriza 2–3 pontos do diagnóstico e convida o lead a validar durante a demo.',
        ),
    ),
    Criterio(
        id='M2',
        bloco='Demonstração',
        titulo='Cases e prova de capacidade',
        peso=2.0,
        rubrica=(
            'Não apresenta prova de capacidade ou usa referências sem relação com o lead.',
            'Apresenta números ou logos, mas sem conectar à realidade do cliente.',
            'Usa escala e cases comparáveis e pergunta qual cenário mais se aproxima da operação.',
        ),
    ),
    Criterio(
        id='M3',
        bloco='Demonstração',
        titulo='Benefício | Diferencial, cenário imaginado e rastreabilidade',
        peso=4.0,
        rubrica=(
            'Descreve funcionalidades sem contraste com o processo atual.',
            'Apresenta benefícios relevantes, mas de forma genérica ou pouco interativa.',
            'Contrasta atual e futuro, mostra identificação, autonomia e evidência e valida o impacto percebido.',
        ),
    ),
    Criterio(
        id='M4',
        bloco='Demonstração',
        titulo='Benefício | Sistemas de acesso e cenários de instalação',
        peso=4.0,
        rubrica=(
            'Não conecta a solução ao ambiente físico ou aos sistemas existentes.',
            'Mostra opções, mas não relaciona ao fluxo do cliente nem identifica pendências.',
            'Aplica integração e instalação ao fluxo real e identifica o que requer validação técnica.',
        ),
    ),
    Criterio(
        id='M5',
        bloco='Demonstração',
        titulo='Benefício | Funcionamento, velocidade e contingência',
        peso=3.0,
        rubrica=(
            'Não demonstra o funcionamento prático.',
            'Mostra o fluxo, mas não valida capacidade, experiência ou contingência.',
            'Demonstra o uso e valida velocidade, pico de pessoas, resultado e operação offline com o lead.',
        ),
    ),
    Criterio(
        id='M6',
        bloco='Demonstração',
        titulo='Benefício | Plataforma, alertas e governança',
        peso=3.0,
        rubrica=(
            'Não mostra registros, alertas ou perfis da plataforma.',
            'Mostra funcionalidades, mas sem ligá-las às necessidades de gestão.',
            'Conecta histórico, evidências, alertas, filtros e perfis às informações que o cliente precisa priorizar.',
        ),
    ),
    Criterio(
        id='M7',
        bloco='Demonstração',
        titulo='Benefício | Calibração, kit e suporte',
        peso=2.0,
        rubrica=(
            'Não esclarece calibração, kit ou suporte.',
            'Explica parcialmente, deixando dúvida de implantação ou continuidade.',
            'Explica troca do módulo, itens do kit, setup e suporte e valida o que a equipe precisa para implantar.',
        ),
    ),
    Criterio(
        id='M8',
        bloco='Demonstração',
        titulo='Validação de percepção e dimensionamento',
        peso=5.0,
        rubrica=(
            'Não pergunta a percepção nem recomenda configuração.',
            'Coleta reação ou discute quantidade, mas não fecha uma recomendação justificada.',
            'Valida valor e lacunas e recomenda equipamentos, pontos e eventual faseamento conforme o fluxo.',
        ),
    ),
    Criterio(
        id='M9',
        bloco='Demonstração',
        titulo='Preço condicionado | Referência comercial',
        peso=4.0,
        rubrica=(
            'Preço ausente, incorreto ou desconectado do escopo.',
            'Apresenta valores e inclusões, mas sem condicionar à quantidade ou testar aderência.',
            'Apresenta compra, recorrência, locação e integrações conforme o dimensionamento e pergunta como o investimento é percebido.',
        ),
    ),
    Criterio(
        id='F1',
        bloco='Fechamento',
        titulo='Evento crítico',
        peso=5.0,
        rubrica=(
            'Não pergunta prazo, marco ou consequência de postergação.',
            'Identifica uma data ou urgência, mas tarde ou sem explorar a consequência.',
            'Mapeia data ou marco crítico e o que acontece se a implantação atrasar.',
        ),
    ),
    Criterio(
        id='F2',
        bloco='Fechamento',
        titulo='Preço e condições',
        peso=3.0,
        rubrica=(
            'Não confirma o investimento final ou apresenta informação inconsistente.',
            'Confirma preço, mas não valida escopo, condição necessária ou objeção real.',
            'Confirma investimento total, escopo e condições e isola o que ainda precisa ser analisado.',
        ),
    ),
    Criterio(
        id='F3',
        bloco='Fechamento',
        titulo='Processo decisório',
        peso=4.0,
        rubrica=(
            'Não mapeia como a compra será decidida.',
            'Identifica parte do rito ou oferece material, mas deixa lacunas de pessoas ou etapas.',
            'Mapeia decisor, influenciadores, validação técnica, orçamento e entrada de compras ou jurídico.',
        ),
    ),
    Criterio(
        id='F4',
        bloco='Fechamento',
        titulo='Riscos e pontos pendentes',
        peso=2.0,
        rubrica=(
            'Não pergunta o que pode impedir o avanço.',
            'Percebe uma objeção, mas não a explicita nem prioriza.',
            'Pergunta diretamente e identifica o maior risco entre aderência, integração, prazo e investimento.',
        ),
    ),
    Criterio(
        id='F5',
        bloco='Fechamento',
        titulo='Validação técnica adicional — se necessária',
        peso=1.0,
        rubrica=(
            'Existe pendência técnica e ela é ignorada.',
            'Reconhece a pendência, mas não define objetivo, participantes ou perguntas.',
            'Quando necessária, propõe reunião técnica objetiva com participantes e questões definidos; use N/A quando não se aplicar.',
        ),
    ),
    Criterio(
        id='F6',
        bloco='Fechamento',
        titulo='Próximo passo com compromisso',
        peso=5.0,
        rubrica=(
            'Encerra com envio de proposta ou retorno aberto.',
            'Define uma ação, mas sem data ou responsáveis claros dos dois lados.',
            'Fecha ação, responsáveis, data e deixa o retorno ou reunião já agendado.',
        ),
    ),
)

FAIXAS: tuple = (
    Faixa(minimo=90.0, veredito='Call padrão ouro'),
    Faixa(minimo=75.0, veredito='Boa call, com gaps claros'),
    Faixa(minimo=60.0, veredito='Call frágil — valor percebido parcial'),
    Faixa(minimo=0.0, veredito='Call informativa — não avançou o negócio'),
)


def criterio_por_id(criterio_id: str):
    """Devolve o critério, ou None se o id não existir na régua."""
    return next((c for c in CRITERIOS if c.id == criterio_id), None)
