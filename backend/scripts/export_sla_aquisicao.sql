-- Negócios ABERTOS do board Aquisição (7) que ultrapassaram o SLA da etapa atual.
-- "SLA sem avanço" = dias parado na etapa atual (entered_at da etapa corrente, sem exited_at).
-- Grupos: 🟡 tem atividade pendente com vencimento futuro | 🔴 não tem.
-- Datas em horário de Brasília.

with n as (select (now() at time zone 'UTC') as t),
sla(list_id, dias) as (values (28,7),(29,7),(30,30),(31,14),(42,14)),
hist as (
    select card_id, list_id, max(entered_at) as entrada
    from card_list_history
    where exited_at is null
    group by card_id, list_id
),
base as (
    select c.id, l.name as etapa, s.dias as sla_dias, h.entrada,
           extract(epoch from (n.t - h.entrada)) / 86400.0 as dias_etapa,
           c.title, c.value, c.assigned_to_id, c.sdr_id
    from cards c
    cross join n
    join lists l on l.id = c.list_id
    join sla s   on s.list_id = l.id
    join hist h  on h.card_id = c.id and h.list_id = c.list_id
    where c.is_won = 0 and c.is_deleted = false
),
acima as (select * from base where dias_etapa > sla_dias),
prox as (
    select distinct on (ct.card_id) ct.card_id, ct.due_date, ct.task_type
    from card_tasks ct
    cross join n
    where ct.is_completed = false and ct.is_cancelled = false and ct.due_date > n.t
    order by ct.card_id, ct.due_date asc
)
select
    case when p.card_id is not null then '🟡 Com atividade futura'
         else '🔴 Sem atividade futura' end                                    as "Grupo",
    a.etapa                                                                    as "Etapa",
    a.sla_dias                                                                 as "SLA (dias)",
    round(a.dias_etapa)                                                        as "Dias na Etapa",
    round(a.dias_etapa - a.sla_dias)                                           as "Dias Acima do SLA",
    a.id                                                                       as "ID",
    a.title                                                                    as "Nome do Negócio",
    coalesce(uasg.name, '')                                                    as "Responsável",
    coalesce(usdr.name, '')                                                    as "SDR",
    a.value                                                                    as "Valor",
    to_char((a.entrada at time zone 'UTC') at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')        as "Entrada na Etapa",
    to_char((p.due_date at time zone 'UTC') at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as "Próxima Atividade",
    case p.task_type
        when 'CALL' then 'Ligação' when 'MEETING' then 'Reunião' when 'TASK' then 'Tarefa'
        when 'FOLLOW_UP' then 'Follow-up' when 'DEADLINE' then 'Prazo' when 'EMAIL' then 'E-mail'
        when 'LUNCH' then 'Almoço' when 'WHATSAPP' then 'WhatsApp' when 'LINKEDIN' then 'LinkedIn'
        when 'OTHER' then 'Outro' else coalesce(p.task_type::text, '') end     as "Tipo da Próxima Atividade",
    'https://hsgrowth.healthsafetytech.com/cards/' || a.id                     as "Link do Card"
from acima a
left join prox p     on p.card_id = a.id
left join users uasg on uasg.id = a.assigned_to_id
left join users usdr on usdr.id = a.sdr_id
order by (case when p.card_id is null then 0 else 1 end), a.dias_etapa desc;
