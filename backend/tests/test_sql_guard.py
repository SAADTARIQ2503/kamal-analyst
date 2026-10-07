import pytest

from app.sql_guard import UnsafeSqlError, validate_select


@pytest.mark.parametrize("sql", [
    "SELECT 1 FROM dual",
    "select a, b from t where x = 1;",
    "WITH c AS (SELECT 1 AS n FROM dual) SELECT n FROM c",
    "SELECT a /* note */ FROM t -- trailing",
])
def test_accepts_read_only_select(sql):
    assert validate_select(sql)


@pytest.mark.parametrize("sql", [
    "",
    "DELETE FROM t",
    "UPDATE t SET a = 1",
    "INSERT INTO t VALUES (1)",
    "SELECT 1 FROM dual; DROP TABLE t",
    "SELECT a FROM t WHERE b = 1 FOR UPDATE",
    "BEGIN NULL; END;",
    "SELECT dbms_xplan FROM t; grant select on t to x",
    "CALL my_proc()",
    "SELECT a INTO v FROM t",
])
def test_rejects_non_select_or_writes(sql):
    with pytest.raises(UnsafeSqlError):
        validate_select(sql)
