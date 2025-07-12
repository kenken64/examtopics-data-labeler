#!/usr/bin/env python3
"""
Python Version Verification Script
Checks if the current Python version is compatible with the backend requirements.
"""

import sys
import subprocess
from packaging import version

REQUIRED_PYTHON_VERSION = "3.12.4"
MIN_PYTHON_VERSION = "3.12.0"

def check_python_version():
    """Check if the current Python version meets requirements."""
    current_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    
    print(f"🐍 Current Python version: {current_version}")
    print(f"🎯 Required Python version: {REQUIRED_PYTHON_VERSION}")
    print(f"📦 Minimum Python version: {MIN_PYTHON_VERSION}")
    
    if version.parse(current_version) >= version.parse(MIN_PYTHON_VERSION):
        if current_version == REQUIRED_PYTHON_VERSION:
            print("✅ Perfect! You're using the exact required Python version.")
        else:
            print("⚠️  Your Python version is compatible but not the exact required version.")
            print(f"   Consider upgrading to Python {REQUIRED_PYTHON_VERSION} for optimal compatibility.")
        return True
    else:
        print("❌ Your Python version is too old!")
        print(f"   Please upgrade to Python {MIN_PYTHON_VERSION} or higher.")
        return False

def check_pip_packages():
    """Check if key packages can be installed."""
    try:
        import packaging
        print("✅ Required packaging module is available.")
        return True
    except ImportError:
        print("❌ Required packaging module is missing.")
        print("   Run: pip install packaging")
        return False

def main():
    """Main verification function."""
    print("🔍 Backend Python Version Verification")
    print("=" * 50)
    
    # Check packaging module first
    if not check_pip_packages():
        return False
    
    # Check Python version
    if not check_python_version():
        return False
    
    print("\n🚀 Your Python environment is ready for Railway deployment!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
