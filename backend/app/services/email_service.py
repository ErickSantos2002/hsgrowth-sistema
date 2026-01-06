"""
Email Service - Serviço para envio de emails via SMTP.
Implementa templates e envio via Microsoft 365.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from datetime import datetime
from loguru import logger

from app.core.config import settings


class EmailService:
    """
    Service para envio de emails via SMTP Microsoft 365.
    """

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM
        self.from_name = settings.SMTP_FROM_NAME

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None
    ) -> bool:
        """
        Envia um email via SMTP.

        Args:
            to_email: Email do destinatário
            subject: Assunto do email
            html_body: Corpo do email em HTML
            plain_body: Corpo do email em texto puro (fallback)

        Returns:
            True se enviado com sucesso, False caso contrário
        """
        # Verifica se SMTP está configurado
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP não configurado. Email não será enviado.")
            logger.info(f"[MOCK EMAIL] Para: {to_email} | Assunto: {subject}")
            return False

        try:
            # Cria mensagem
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Adiciona corpo em texto puro (fallback)
            if plain_body:
                part1 = MIMEText(plain_body, "plain", "utf-8")
                message.attach(part1)

            # Adiciona corpo em HTML
            part2 = MIMEText(html_body, "html", "utf-8")
            message.attach(part2)

            # Conecta ao servidor SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()  # Habilita TLS
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, message.as_string())

            logger.info(f"Email enviado com sucesso para {to_email}")
            return True

        except smtplib.SMTPAuthenticationError:
            logger.error("Erro de autenticação SMTP. Verifique usuário/senha.")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"Erro ao enviar email: {e}")
            return False
        except Exception as e:
            logger.error(f"Erro inesperado ao enviar email: {e}")
            return False

    def _get_base_template(self, content: str, title: str = "HSGrowth CRM") -> str:
        """
        Retorna template HTML base para emails.

        Args:
            content: Conteúdo HTML do email
            title: Título do email

        Returns:
            HTML completo
        """
        return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px 20px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
            font-weight: 500;
        }}
        .button:hover {{
            background-color: #5568d3;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }}
        .alert {{
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .alert-danger {{
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }}
        .alert-warning {{
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }}
        .alert-info {{
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }}
        .code-block {{
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            overflow-x: auto;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 HSGrowth CRM</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>© 2026 HSGrowth CRM. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda.</p>
        </div>
    </div>
</body>
</html>
"""

    # ================== Templates de Email ==================

    def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """
        Envia email de reset de senha.

        Args:
            to_email: Email do destinatário
            user_name: Nome do usuário
            reset_token: Token de reset de senha

        Returns:
            True se enviado com sucesso
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        content = f"""
            <h2>Olá, {user_name}!</h2>
            <p>Você solicitou a redefinição de senha da sua conta no HSGrowth CRM.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="{reset_url}" class="button">Redefinir Senha</a>
            <p>Este link é válido por <strong>1 hora</strong>.</p>
            <div class="alert alert-warning">
                <strong>⚠️ Atenção:</strong> Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá inalterada.
            </div>
            <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
            <div class="code-block">{reset_url}</div>
        """

        html_body = self._get_base_template(content, "Redefinir Senha - HSGrowth CRM")

        plain_body = f"""
        Olá, {user_name}!

        Você solicitou a redefinição de senha da sua conta no HSGrowth CRM.

        Acesse o link abaixo para criar uma nova senha:
        {reset_url}

        Este link é válido por 1 hora.

        Se você não solicitou esta alteração, ignore este email.

        ---
        HSGrowth CRM
        """

        return self._send_email(
            to_email=to_email,
            subject="Redefinir Senha - HSGrowth CRM",
            html_body=html_body,
            plain_body=plain_body
        )

    def send_automation_failure_email(
        self,
        to_email: str,
        user_name: str,
        automation_name: str,
        automation_id: int,
        error_message: str,
        failed_at: datetime
    ) -> bool:
        """
        Envia email de falha em automação (crítico).

        Args:
            to_email: Email do destinatário
            user_name: Nome do usuário
            automation_name: Nome da automação
            automation_id: ID da automação
            error_message: Mensagem de erro
            failed_at: Data/hora da falha

        Returns:
            True se enviado com sucesso
        """
        automation_url = f"{settings.FRONTEND_URL}/automations/{automation_id}"
        failed_at_str = failed_at.strftime("%d/%m/%Y às %H:%M")

        content = f"""
            <h2>⚠️ Falha em Automação Detectada</h2>
            <p>Olá, {user_name}!</p>
            <p>A automação <strong>"{automation_name}"</strong> falhou durante a execução.</p>

            <div class="alert alert-danger">
                <strong>🔴 Erro Crítico:</strong> Esta automação falhou <strong>3 ou mais vezes</strong> na última hora.
            </div>

            <h3>Detalhes da Falha:</h3>
            <table>
                <tr>
                    <th>Automação</th>
                    <td>{automation_name}</td>
                </tr>
                <tr>
                    <th>ID</th>
                    <td>#{automation_id}</td>
                </tr>
                <tr>
                    <th>Data/Hora</th>
                    <td>{failed_at_str}</td>
                </tr>
                <tr>
                    <th>Erro</th>
                    <td style="color: #dc3545;">{error_message}</td>
                </tr>
            </table>

            <a href="{automation_url}" class="button">Ver Automação</a>

            <div class="alert alert-info">
                <strong>ℹ️ Ação Recomendada:</strong> Verifique a automação e corrija o problema. Considere desativá-la temporariamente se o erro persistir.
            </div>
        """

        html_body = self._get_base_template(content, "🔴 Falha em Automação - HSGrowth CRM")

        plain_body = f"""
        ⚠️ Falha em Automação Detectada

        Olá, {user_name}!

        A automação "{automation_name}" falhou durante a execução.

        ERRO CRÍTICO: Esta automação falhou 3 ou mais vezes na última hora.

        Detalhes:
        - Automação: {automation_name}
        - ID: #{automation_id}
        - Data/Hora: {failed_at_str}
        - Erro: {error_message}

        Acesse: {automation_url}

        Ação Recomendada: Verifique a automação e corrija o problema.

        ---
        HSGrowth CRM
        """

        return self._send_email(
            to_email=to_email,
            subject=f"🔴 Falha em Automação: {automation_name}",
            html_body=html_body,
            plain_body=plain_body
        )

    def send_automation_failures_grouped_email(
        self,
        to_email: str,
        user_name: str,
        failures: List[dict]
    ) -> bool:
        """
        Envia email agrupado com múltiplas falhas de automação.

        Args:
            to_email: Email do destinatário
            user_name: Nome do usuário
            failures: Lista de falhas [{automation_name, automation_id, error_message, count}]

        Returns:
            True se enviado com sucesso
        """
        total_failures = len(failures)
        automations_url = f"{settings.FRONTEND_URL}/automations"

        # Monta tabela de falhas
        failures_table_rows = ""
        for failure in failures:
            failures_table_rows += f"""
                <tr>
                    <td><strong>{failure['automation_name']}</strong></td>
                    <td>#{failure['automation_id']}</td>
                    <td style="color: #dc3545;">{failure['count']}x</td>
                    <td style="font-size: 12px;">{failure['error_message'][:80]}...</td>
                </tr>
            """

        content = f"""
            <h2>⚠️ Múltiplas Falhas em Automações</h2>
            <p>Olá, {user_name}!</p>
            <p>Detectamos <strong>{total_failures} automações</strong> com falhas recorrentes na última hora.</p>

            <div class="alert alert-danger">
                <strong>🔴 Atenção:</strong> Estas automações foram desabilitadas automaticamente para evitar problemas.
            </div>

            <h3>Automações com Falha:</h3>
            <table>
                <thead>
                    <tr>
                        <th>Automação</th>
                        <th>ID</th>
                        <th>Falhas</th>
                        <th>Último Erro</th>
                    </tr>
                </thead>
                <tbody>
                    {failures_table_rows}
                </tbody>
            </table>

            <a href="{automations_url}" class="button">Ver Todas as Automações</a>

            <div class="alert alert-info">
                <strong>ℹ️ Próximos Passos:</strong>
                <ol>
                    <li>Acesse cada automação listada acima</li>
                    <li>Corrija os erros identificados</li>
                    <li>Reative as automações após a correção</li>
                </ol>
            </div>
        """

        html_body = self._get_base_template(content, "🔴 Múltiplas Falhas em Automações - HSGrowth CRM")

        # Plain text
        plain_failures = "\n".join([
            f"- {f['automation_name']} (ID #{f['automation_id']}): {f['count']}x falhas"
            for f in failures
        ])

        plain_body = f"""
        ⚠️ Múltiplas Falhas em Automações

        Olá, {user_name}!

        Detectamos {total_failures} automações com falhas recorrentes na última hora.

        ATENÇÃO: Estas automações foram desabilitadas automaticamente.

        Automações com Falha:
        {plain_failures}

        Acesse: {automations_url}

        Próximos Passos:
        1. Acesse cada automação
        2. Corrija os erros
        3. Reative as automações

        ---
        HSGrowth CRM
        """

        return self._send_email(
            to_email=to_email,
            subject=f"🔴 {total_failures} Automações com Falha - Ação Necessária",
            html_body=html_body,
            plain_body=plain_body
        )

    def send_automation_disabled_email(
        self,
        to_email: str,
        user_name: str,
        automation_name: str,
        automation_id: int,
        reason: str
    ) -> bool:
        """
        Envia email notificando que automação foi desabilitada.

        Args:
            to_email: Email do destinatário
            user_name: Nome do usuário
            automation_name: Nome da automação
            automation_id: ID da automação
            reason: Motivo da desabilitação

        Returns:
            True se enviado com sucesso
        """
        automation_url = f"{settings.FRONTEND_URL}/automations/{automation_id}"

        content = f"""
            <h2>🔴 Automação Desabilitada Automaticamente</h2>
            <p>Olá, {user_name}!</p>
            <p>A automação <strong>"{automation_name}"</strong> foi desabilitada automaticamente pelo sistema.</p>

            <div class="alert alert-warning">
                <strong>Motivo:</strong> {reason}
            </div>

            <h3>Detalhes:</h3>
            <table>
                <tr>
                    <th>Automação</th>
                    <td>{automation_name}</td>
                </tr>
                <tr>
                    <th>ID</th>
                    <td>#{automation_id}</td>
                </tr>
            </table>

            <a href="{automation_url}" class="button">Ver Automação</a>

            <p>Para reativá-la, corrija o problema e habilite manualmente na interface.</p>
        """

        html_body = self._get_base_template(content, "Automação Desabilitada - HSGrowth CRM")

        return self._send_email(
            to_email=to_email,
            subject=f"🔴 Automação Desabilitada: {automation_name}",
            html_body=html_body
        )

    def send_welcome_email(
        self,
        to_email: str,
        user_name: str
    ) -> bool:
        """
        Envia email de boas-vindas para novo usuário.

        Args:
            to_email: Email do destinatário
            user_name: Nome do usuário

        Returns:
            True se enviado com sucesso
        """
        login_url = f"{settings.FRONTEND_URL}/login"

        content = f"""
            <h2>🎉 Bem-vindo ao HSGrowth CRM!</h2>
            <p>Olá, {user_name}!</p>
            <p>Sua conta foi criada com sucesso. Estamos felizes em tê-lo(a) conosco!</p>

            <h3>Primeiros Passos:</h3>
            <ol>
                <li>Faça login no sistema</li>
                <li>Complete seu perfil</li>
                <li>Explore os quadros e cards</li>
                <li>Configure suas notificações</li>
            </ol>

            <a href="{login_url}" class="button">Acessar Sistema</a>

            <p>Se precisar de ajuda, entre em contato com seu gerente ou administrador.</p>
        """

        html_body = self._get_base_template(content, "Bem-vindo - HSGrowth CRM")

        return self._send_email(
            to_email=to_email,
            subject="🎉 Bem-vindo ao HSGrowth CRM!",
            html_body=html_body
        )


# Instância global do serviço de email
email_service = EmailService()
