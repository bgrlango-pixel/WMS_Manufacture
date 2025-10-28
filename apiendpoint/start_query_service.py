#!/usr/bin/env python3
"""
Production startup script for ERP Query Service
Optimized for production deployment
"""
import os
import sys
import uvicorn
import logging
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from app.core.config import settings
from app.database.session import check_database_health

def setup_logging():
    """Configure production logging"""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format=settings.LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/query_service.log", mode='a')
        ] if settings.is_production else [logging.StreamHandler(sys.stdout)]
    )

def check_prerequisites():
    """Check system prerequisites before starting"""
    logger = logging.getLogger(__name__)
    
    # Check database connection
    if not check_database_health():
        logger.error("❌ Database health check failed")
        sys.exit(1)
    
    logger.info("✅ All prerequisites checked")

def main():
    """Main startup function"""
    # Create logs directory if it doesn't exist
    if settings.is_production:
        os.makedirs("logs", exist_ok=True)
    
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("🚀 Starting ERP Query Service...")
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🌐 Port: {settings.API_PORT}")
    
    # Check prerequisites
    check_prerequisites()
    
    # Configure uvicorn settings
    uvicorn_config = {
        "app": "app.main:app",  # Use the full featured main app, not main_basic
        "host": "0.0.0.0" if settings.is_production else "127.0.0.1",
        "port": settings.API_PORT,
        "reload": settings.DEBUG and not settings.is_production,
        "log_level": settings.LOG_LEVEL.lower(),
        "access_log": True,
        "use_colors": not settings.is_production,
    }
    
    # Production-specific settings
    if settings.is_production:
        uvicorn_config.update({
            "workers": 4,  # Multiple workers for production
            "loop": "uvloop",  # High-performance event loop
            "http": "httptools",  # High-performance HTTP parser
            "log_config": None,  # Use our custom logging
            "server_header": False,  # Don't expose server info
            "date_header": False,  # Don't include date header
        })
    
    logger.info("🔧 Starting with configuration:")
    for key, value in uvicorn_config.items():
        if key != "app":
            logger.info(f"   {key}: {value}")
    
    try:
        uvicorn.run(**uvicorn_config)
    except KeyboardInterrupt:
        logger.info("⚡ Shutting down gracefully...")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
