-- Export de TODAS as atividades (card_tasks) atreladas aos negócios (boards Prospecção=6 e Aquisição=7)
-- 1 linha por atividade. Datas em horário de Brasília.

SELECT
    -- Atividade (card_tasks)
    ct.id                                                                          AS "ID Atividade",
    CASE ct.task_type
        WHEN 'CALL' THEN 'Ligação'
        WHEN 'MEETING' THEN 'Reunião'
        WHEN 'TASK' THEN 'Tarefa'
        WHEN 'FOLLOW_UP' THEN 'Follow-up'
        WHEN 'DEADLINE' THEN 'Prazo'
        WHEN 'EMAIL' THEN 'E-mail'
        WHEN 'LUNCH' THEN 'Almoço'
        WHEN 'WHATSAPP' THEN 'WhatsApp'
        WHEN 'LINKEDIN' THEN 'LinkedIn'
        WHEN 'OTHER' THEN 'Outro'
        ELSE ct.task_type::text
    END                                                                           AS "Tipo",
    ct.title                                                                       AS "Título",
    ct.description                                                                 AS "Descrição",
    ct.notes                                                                       AS "Notas",
    CASE ct.priority
        WHEN 'NORMAL' THEN 'Normal'
        WHEN 'HIGH' THEN 'Alta'
        WHEN 'URGENT' THEN 'Urgente'
        ELSE ct.priority::text
    END                                                                           AS "Prioridade",
    -- Situação consolidada para filtro
    CASE
        WHEN ct.is_cancelled IS TRUE THEN 'Cancelada'
        WHEN ct.is_completed IS TRUE AND ct.is_noshow IS TRUE THEN 'Concluída (No-Show)'
        WHEN ct.is_completed IS TRUE THEN 'Concluída'
        WHEN ct.due_date IS NULL THEN 'Pendente (sem data)'
        WHEN ct.due_date < (now() AT TIME ZONE 'UTC') THEN 'Pendente (atrasada)'
        ELSE 'Futura (agendada)'
    END                                                                           AS "Situação",
    CASE WHEN ct.is_valid IS TRUE THEN 'Sim' WHEN ct.is_valid IS FALSE THEN 'Não' ELSE '' END  AS "Válida?",
    CASE WHEN ct.is_noshow IS TRUE THEN 'Sim' ELSE 'Não' END                      AS "No-Show",
    CASE WHEN ct.is_cancelled IS TRUE THEN 'Sim' ELSE 'Não' END                   AS "Cancelada",
    ct.duration_minutes                                                           AS "Duração (min)",
    ct.location                                                                   AS "Local",
    uexec.name                                                                    AS "Executor (responsável)",
    ucreat.name                                                                   AS "Criado por",
    to_char((ct.due_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')      AS "Data de Vencimento",
    to_char((ct.completed_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')  AS "Data de Conclusão",
    to_char((ct.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')    AS "Data de Criação (atividade)",

    -- Negócio (cards)
    c.id                                                                          AS "ID Negócio",
    c.title                                                                        AS "Nome do Negócio",
    CASE c.is_won WHEN 1 THEN 'Ganho' WHEN -1 THEN 'Perdido' ELSE 'Aberto' END     AS "Status do Negócio",
    bb.name                                                                        AS "Board Atual",
    ll.name                                                                        AS "Etapa Atual",
    c.acquisition_channel                                                          AS "Canal de Aquisição",
    c.acquisition_channel_detail                                                   AS "Canal - Detalhamento",
    c.loss_reason                                                                  AS "Motivo de Perda",
    usdr.name                                                                      AS "SDR",
    ucloser.name                                                                   AS "Vendedor/Closer",
    c.value                                                                        AS "Valor do Negócio",
    to_char((c.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')  AS "Criação do Negócio",
    to_char((c.closed_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')   AS "Fechamento do Negócio",

    -- Empresa (clients)
    cl.company_name                                                               AS "Empresa - Razão Social",
    cl.name                                                                       AS "Empresa - Nome (contato)",
    cl.document                                                                   AS "Empresa - CNPJ/CPF",
    cl.sector                                                                      AS "Empresa - Setor",
    cl.city                                                                        AS "Empresa - Cidade",
    cl.state                                                                       AS "Empresa - UF"

FROM card_tasks ct
JOIN cards c            ON c.id = ct.card_id
JOIN lists ll           ON ll.id = c.list_id
JOIN boards bb          ON bb.id = ll.board_id
LEFT JOIN users uexec   ON uexec.id = ct.assigned_to_id
LEFT JOIN users ucreat  ON ucreat.id = ct.created_by_id
LEFT JOIN users usdr    ON usdr.id = c.sdr_id
LEFT JOIN users ucloser ON ucloser.id = c.assigned_to_id
LEFT JOIN clients cl    ON cl.id = c.client_id
WHERE bb.id IN (6, 7)
ORDER BY ct.id;
