#!/usr/bin/env python3
"""
Production startup script for Railway deployment
"""
import os
import sys
from app import app

if __name__ == '__main__':
    # Ensure we're using production settings
    os.environ.setdefault('FLASK_ENV', 'production')
    os.environ.setdefault('FLASK_DEBUG', 'False')
    
    # Get port from Railway environment
    port = int(os.getenv('PORT', 5000))
    
    print(f"Starting ExamTopics Backend on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'production')}")
    print(f"Debug mode: {os.getenv('FLASK_DEBUG', 'False')}")
    
    # Run with Gunicorn in production or Flask dev server locally
    if os.getenv('RAILWAY_ENVIRONMENT') == 'production':
        import gunicorn.app.wsgiapp as wsgi
        sys.argv = [
            'gunicorn',
            '--bind', f'0.0.0.0:{port}',
            '--workers', '4',
            '--worker-class', 'sync',
            '--worker-connections', '1000',
            '--timeout', '120',
            '--keepalive', '5',
            '--max-requests', '1000',
            '--max-requests-jitter', '100',
            '--access-logfile', '-',
            '--error-logfile', '-',
            '--log-level', 'info',
            'app:app'
        ]
        wsgi.run()
    else:
        # Development mode
        app.run(host='0.0.0.0', port=port, debug=False)
