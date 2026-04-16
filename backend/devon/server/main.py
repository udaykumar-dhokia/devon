import uvicorn
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Start Devon API Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind the server to")
    args = parser.parse_args()

    uvicorn.run("devon.server.app:app", host=args.host, port=args.port, log_level="info")

if __name__ == "__main__":
    main()
