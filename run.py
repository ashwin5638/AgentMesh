import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        # psycopg's async driver needs SelectorEventLoop on Windows.
        loop="app.core.loop:selector_loop_factory",
    )
