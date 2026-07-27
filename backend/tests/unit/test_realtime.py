import asyncio
import pytest
from app.core import realtime


def test_channel_key_namespaces_scope():
    assert realtime.channel_key("sales", 5) == "sales:5"
    assert realtime.channel_key("service", 5) == "service:5"
    assert realtime.channel_key("sales", 5) != realtime.channel_key("service", 5)


def test_build_move_event_shape():
    ev = realtime.build_move_event("sales", 3, 42, 7, 1024.0)
    assert ev == {
        "type": "card_moved",
        "scope": "sales",
        "board_id": 3,
        "card_id": 42,
        "list_id": 7,
        "position": 1024.0,
    }


@pytest.mark.asyncio
async def test_subscribe_fanout_unsubscribe():
    key = realtime.channel_key("sales", 99)
    q = realtime.subscribe(key)
    realtime._fanout(key, {"hello": "world"})
    assert await asyncio.wait_for(q.get(), timeout=1) == {"hello": "world"}
    realtime.unsubscribe(key, q)
    assert key not in realtime._subscribers


@pytest.mark.asyncio
async def test_dispatch_parses_and_fans_out():
    key = realtime.channel_key("service", 2)
    q = realtime.subscribe(key)
    import json
    raw = json.dumps(realtime.build_move_event("service", 2, 10, 4, 500.0))
    realtime.dispatch(raw)
    ev = await asyncio.wait_for(q.get(), timeout=1)
    assert ev["card_id"] == 10 and ev["list_id"] == 4
    realtime.unsubscribe(key, q)


def test_stream_ticket_roundtrip():
    tk = realtime.create_stream_ticket("user@x.com", "sales", 7)
    payload = realtime.decode_stream_ticket(tk)
    assert payload is not None
    assert payload["sub"] == "user@x.com"
    assert payload["board_scope"] == "sales"
    assert payload["board_id"] == 7


def test_stream_ticket_rejects_session_token():
    from app.core.security import create_access_token
    normal = create_access_token({"sub": "user@x.com"})
    assert realtime.decode_stream_ticket(normal) is None


def test_stream_ticket_rejects_garbage():
    assert realtime.decode_stream_ticket("not-a-jwt") is None
