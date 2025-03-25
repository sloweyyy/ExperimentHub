"""
ExperimentHub Backend - A machine learning experiment management system.

This package provides the backend API for the ExperimentHub application,
allowing users to create, manage, and monitor machine learning experiments.
"""
from setuptools import find_packages, setup

setup(
    name="experimenthub-backend",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.9",
    install_requires=[
        line.strip()
        for line in open("requirements.txt")
        if not line.startswith("-") and not line.startswith("#")
    ],
    extras_require={
        "dev": [
            line.strip()
            for line in open("requirements-dev.txt")
            if not line.startswith("-") and not line.startswith("#")
        ],
    },
)
