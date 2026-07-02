-- Export do histórico do CRM (boards Prospecção=6 e Aquisição=7)
-- Layout A: 1 linha por negócio, com colunas de dias por etapa.
-- Datas em horário de Brasília. Uso: psql "$DBURL" -f este_arquivo.sql (via \copy no wrapper)

WITH stage_times AS (
    SELECT
        card_id,
        ROUND((SUM(CASE WHEN list_id = 22 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_lead_novo,
        ROUND((SUM(CASE WHEN list_id = 23 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_prospeccao,
        ROUND((SUM(CASE WHEN list_id = 24 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_conectado,
        ROUND((SUM(CASE WHEN list_id = 25 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_reagendamento,
        ROUND((SUM(CASE WHEN list_id = 26 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_agendado,
        ROUND((SUM(CASE WHEN list_id = 27 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_prosp_perdido,
        ROUND((SUM(CASE WHEN list_id = 28 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_reuniao_agendada,
        ROUND((SUM(CASE WHEN list_id = 29 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_qualificacao,
        ROUND((SUM(CASE WHEN list_id = 30 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_diag_proposta,
        ROUND((SUM(CASE WHEN list_id = 31 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_negociacao,
        ROUND((SUM(CASE WHEN list_id = 42 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_aguardando_pedido,
        ROUND((SUM(CASE WHEN list_id = 33 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_perdido,
        ROUND((SUM(CASE WHEN list_id = 32 THEN secs ELSE 0 END) / 86400.0)::numeric, 2) AS d_aquis_ganho
    FROM (
        SELECT
            card_id,
            list_id,
            EXTRACT(EPOCH FROM (COALESCE(exited_at, now() AT TIME ZONE 'UTC') - entered_at)) AS secs
        FROM card_list_history
        WHERE board_id IN (6, 7)
    ) h
    GROUP BY card_id
),
creator AS (
    SELECT DISTINCT ON (entity_id)
        entity_id AS card_id,
        user_id
    FROM audit_logs
    WHERE entity_type = 'Card' AND action = 'CREATE'
    ORDER BY entity_id, created_at ASC
)
SELECT
    -- Identificação
    c.id                                                                          AS "ID",
    bb.name                                                                        AS "Board Atual",
    ll.name                                                                        AS "Etapa Atual",
    CASE c.is_won WHEN 1 THEN 'Ganho' WHEN -1 THEN 'Perdido' ELSE 'Aberto' END     AS "Status",

    -- Negócio
    c.title                                                                        AS "Nome do Negócio",
    c.value                                                                        AS "Valor",
    c.currency                                                                     AS "Moeda",
    c.deal_type                                                                    AS "Tipo de Negócio",
    c.modality                                                                     AS "Modalidade",
    c.acquisition_channel                                                          AS "Canal de Aquisição",
    c.acquisition_channel_detail                                                   AS "Canal - Detalhamento",
    c.utm_source                                                                   AS "UTM Source",
    c.utm_campaign                                                                 AS "UTM Campaign",
    c.utm_term                                                                     AS "UTM Term",
    c.origin                                                                       AS "Origem (campo)",
    c.loss_reason                                                                  AS "Motivo de Perda",
    CASE WHEN c.has_implementation IS TRUE THEN 'Sim' WHEN c.has_implementation IS FALSE THEN 'Não' ELSE '' END  AS "Tem Implementação",
    CASE WHEN c.has_personnel IS TRUE THEN 'Sim' WHEN c.has_personnel IS FALSE THEN 'Não' ELSE '' END            AS "Tem Pessoas p/ Manusear",
    usdr.name                                                                      AS "SDR",
    ucl.name                                                                       AS "Closer/Vendedor",
    ucreator.name                                                                  AS "Criado por (nome)",
    CASE rcreator.name
        WHEN 'sdr' THEN 'SDR'
        WHEN 'salesperson' THEN 'Vendedor'
        WHEN 'manager' THEN 'Gerente'
        WHEN 'admin' THEN 'Admin'
        ELSE rcreator.name
    END                                                                           AS "Criado por (origem)",
    to_char((c.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')           AS "Data de Criação",
    to_char((c.closed_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI')           AS "Data de Fechamento",
    to_char((c.prospection_entry_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') AS "Entrada Prospecção",
    to_char((c.acquisition_entry_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') AS "Entrada Aquisição",
    CASE WHEN c.closed_at IS NOT NULL
         THEN ROUND((EXTRACT(EPOCH FROM (c.closed_at - c.created_at)) / 86400.0)::numeric, 2)
         ELSE NULL END                                                            AS "Dias Total (criação→fechamento)",

    -- Contato (persons)
    p.first_name                                                                  AS "Contato - Nome",
    p.last_name                                                                   AS "Contato - Sobrenome",
    p.name                                                                        AS "Contato - Nome Completo",
    p.email                                                                       AS "Contato - E-mail",
    p.email_commercial                                                            AS "Contato - E-mail Comercial",
    p.email_personal                                                              AS "Contato - E-mail Pessoal",
    p.phone                                                                       AS "Contato - Telefone",
    p.phone_whatsapp                                                              AS "Contato - WhatsApp",
    p.phone_commercial                                                            AS "Contato - Tel. Comercial",
    p.linkedin                                                                    AS "Contato - LinkedIn",
    p.position                                                                    AS "Contato - Cargo",
    p.area                                                                        AS "Contato - Área",
    powner.name                                                                   AS "Contato - Proprietário",

    -- Empresa (clients) — todos os campos
    cl.name                                                                       AS "Empresa - Nome (contato)",
    cl.company_name                                                               AS "Empresa - Razão Social",
    cl.email                                                                      AS "Empresa - E-mail",
    cl.phone                                                                      AS "Empresa - Telefone",
    cl.document                                                                   AS "Empresa - CNPJ/CPF",
    cl.cnae                                                                       AS "Empresa - CNAE",
    cl.website                                                                    AS "Empresa - Website",
    cl.linkedin_url                                                               AS "Empresa - LinkedIn",
    cl.address                                                                    AS "Empresa - Endereço",
    cl.city                                                                       AS "Empresa - Cidade",
    cl.state                                                                      AS "Empresa - UF",
    cl.country                                                                    AS "Empresa - País",
    cl.relationship_type                                                          AS "Empresa - Tipo/Relacionamento",
    cl.commercial_activity                                                        AS "Empresa - Atividade Comercial",
    cl.sector                                                                     AS "Empresa - Setor",
    cl.employee_count                                                             AS "Empresa - Nº Colaboradores",
    cl.annual_revenue                                                             AS "Empresa - Faturamento Anual",
    CASE WHEN cl.is_active THEN 'Sim' ELSE 'Não' END                              AS "Empresa - Ativo",
    cl.source                                                                     AS "Empresa - Origem (source)",

    -- Tempo por etapa (dias) — Prospecção
    COALESCE(st.d_prosp_lead_novo, 0)        AS "Dias | Prosp: Lead Novo",
    COALESCE(st.d_prosp_prospeccao, 0)       AS "Dias | Prosp: Prospecção",
    COALESCE(st.d_prosp_conectado, 0)        AS "Dias | Prosp: Conectado",
    COALESCE(st.d_prosp_reagendamento, 0)    AS "Dias | Prosp: Reagendamento",
    COALESCE(st.d_prosp_agendado, 0)         AS "Dias | Prosp: Agendado",
    COALESCE(st.d_prosp_perdido, 0)          AS "Dias | Prosp: Negócio Perdido",
    -- Tempo por etapa (dias) — Aquisição
    COALESCE(st.d_aquis_reuniao_agendada, 0) AS "Dias | Aquis: Reunião Agendada",
    COALESCE(st.d_aquis_qualificacao, 0)     AS "Dias | Aquis: Qualificação",
    COALESCE(st.d_aquis_diag_proposta, 0)    AS "Dias | Aquis: Diagnóstico e Proposta",
    COALESCE(st.d_aquis_negociacao, 0)       AS "Dias | Aquis: Negociação",
    COALESCE(st.d_aquis_aguardando_pedido, 0) AS "Dias | Aquis: Aguardando Pedido",
    COALESCE(st.d_aquis_perdido, 0)          AS "Dias | Aquis: Negócio Perdido",
    COALESCE(st.d_aquis_ganho, 0)            AS "Dias | Aquis: Negócio Ganho"

FROM cards c
JOIN lists ll          ON ll.id = c.list_id
JOIN boards bb         ON bb.id = ll.board_id
LEFT JOIN clients cl   ON cl.id = c.client_id
LEFT JOIN persons p    ON p.id = c.person_id
LEFT JOIN users usdr   ON usdr.id = c.sdr_id
LEFT JOIN users ucl    ON ucl.id = c.assigned_to_id
LEFT JOIN users powner ON powner.id = p.owner_id
LEFT JOIN creator cr   ON cr.card_id = c.id
LEFT JOIN users ucreator ON ucreator.id = cr.user_id
LEFT JOIN roles rcreator ON rcreator.id = ucreator.role_id
LEFT JOIN stage_times st ON st.card_id = c.id
WHERE bb.id IN (6, 7)
ORDER BY c.id;
