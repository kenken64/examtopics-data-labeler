#!/usr/bin/env python3
"""
Test Setup Validator
Validates that the test environment is properly configured
"""

import sys
import os
import subprocess
import importlib
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if Path(filepath).exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} (MISSING)")
        return False

def check_import(module_name, description):
    """Check if a Python module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {description}: {module_name}")
        return True
    except ImportError:
        print(f"❌ {description}: {module_name} (NOT INSTALLED)")
        return False

def check_command(command, description):
    """Check if a command exists"""
    try:
        subprocess.run([command, "--version"], 
                      capture_output=True, check=True)
        print(f"✅ {description}: {command}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"❌ {description}: {command} (NOT AVAILABLE)")
        return False

def main():
    print("🔍 Backend Test Setup Validator")
    print("=" * 40)
    
    all_checks_passed = True
    
    # Check main application file
    print("\n📁 Core Files:")
    all_checks_passed &= check_file_exists("app.py", "Main application")
    all_checks_passed &= check_file_exists("requirements.txt", "Dependencies")
    all_checks_passed &= check_file_exists("requirements-test.txt", "Test dependencies")
    
    # Check test files
    print("\n🧪 Test Files:")
    all_checks_passed &= check_file_exists("tests/__init__.py", "Test package")
    all_checks_passed &= check_file_exists("tests/conftest.py", "Test configuration")
    all_checks_passed &= check_file_exists("tests/test_app.py", "Unit tests")
    all_checks_passed &= check_file_exists("tests/test_integration.py", "Integration tests")
    all_checks_passed &= check_file_exists("tests/test_utilities.py", "Utility tests")
    all_checks_passed &= check_file_exists("tests/test_fixtures.py", "Test fixtures")
    
    # Check pytest configuration
    print("\n⚙️  Test Configuration:")
    all_checks_passed &= check_file_exists("pytest.ini", "Pytest configuration")
    all_checks_passed &= check_file_exists("run-tests.sh", "Test runner script")
    all_checks_passed &= check_file_exists("Makefile", "Make commands")
    
    # Check Python modules
    print("\n🐍 Python Dependencies:")
    all_checks_passed &= check_import("flask", "Flask framework")
    all_checks_passed &= check_import("pytest", "Pytest testing")
    all_checks_passed &= check_import("pytest_cov", "Coverage plugin")
    all_checks_passed &= check_import("pytest_flask", "Flask testing")
    all_checks_passed &= check_import("pytest_mock", "Mock plugin")
    
    # Check optional test dependencies
    print("\n📦 Test Dependencies:")
    check_import("reportlab", "PDF generation (for tests)")
    check_import("PIL", "Image processing")
    check_import("requests_mock", "HTTP mocking")
    
    # Check system commands
    print("\n💻 System Commands:")
    check_command("python3", "Python interpreter")
    check_command("pip", "Python package manager")
    
    # Check environment variables
    print("\n🌍 Environment:")
    if os.getenv("FLASK_ENV"):
        print(f"✅ FLASK_ENV: {os.getenv('FLASK_ENV')}")
    else:
        print("ℹ️  FLASK_ENV: Not set (will use default)")
    
    if os.getenv("OPENAI_API_KEY"):
        print("✅ OPENAI_API_KEY: Set")
    else:
        print("ℹ️  OPENAI_API_KEY: Not set (tests will use mock)")
    
    # Test directory structure
    print("\n📂 Directory Structure:")
    test_dirs = ["tests", "htmlcov", ".pytest_cache"]
    for dir_name in test_dirs:
        if Path(dir_name).exists():
            print(f"✅ Directory exists: {dir_name}")
        else:
            print(f"ℹ️  Directory will be created: {dir_name}")
    
    # Run a quick syntax check
    print("\n🔍 Syntax Check:")
    try:
        result = subprocess.run([sys.executable, "-m", "py_compile", "app.py"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ app.py syntax is valid")
        else:
            print(f"❌ app.py syntax error: {result.stderr}")
            all_checks_passed = False
    except Exception as e:
        print(f"❌ Could not check syntax: {e}")
        all_checks_passed = False
    
    # Summary
    print("\n" + "=" * 40)
    if all_checks_passed:
        print("🎉 ALL CRITICAL CHECKS PASSED!")
        print("Your test environment is ready.")
        print("\nNext steps:")
        print("  1. Run './run-tests.sh' for full test suite")
        print("  2. Run 'make test' for quick testing")
        print("  3. Run 'make coverage' for coverage report")
        return 0
    else:
        print("⚠️  SOME CHECKS FAILED!")
        print("Please install missing dependencies before running tests.")
        print("\nTo fix issues:")
        print("  1. pip install -r requirements-test.txt")
        print("  2. pip install reportlab")
        print("  3. Re-run this validator")
        return 1

if __name__ == "__main__":
    sys.exit(main())