from app import store


def test_views_are_private_to_their_user(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "t.sqlite")
    v = store.add_view("alice", "grey", "Dec", {"manager": "IMRAN"})
    assert store.list_views("alice", "grey")[0]["filters"] == {"manager": "IMRAN"}
    assert store.list_views("bob", "grey") == []
    assert store.delete_view("bob", v["id"]) is False
    assert store.delete_view("alice", v["id"]) is True
