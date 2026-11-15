import asyncio


def selector_loop_factory() -> asyncio.AbstractEventLoop:
    """Return a SelectorEventLoop instance.

    psycopg's async driver cannot run on Windows' default ProactorEventLoop,
    which uvicorn selects on win32. Use with:
        uvicorn app.main:app --reload --loop app.core.loop:selector_loop_factory
    or run `python run.py`.
    """
    return asyncio.SelectorEventLoop()
