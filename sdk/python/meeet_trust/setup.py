"""
MEEET Trust Guard - Setup Configuration

A trust verification adapter for AI agent frameworks (CrewAI, AutoGen, LangGraph).
"""

from setuptools import find_packages, setup

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="meeet-trust",
    version="0.1.0",
    author="MEEET World",
    author_email="dev@meeet.world",
    description="Trust verification adapter for AI agent frameworks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies - uses stdlib only
    ],
    extras_require={
        "crewai": ["crewai>=0.50.0"],
        "autogen": ["pyautogen>=0.2.0"],
        "langgraph": ["langgraph>=0.0.20"],
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-mock>=3.10.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "meeet-trust=meeet_trust.__main__:main",
        ],
    },
    keywords="ai agents trust verification meeet crewai autogen langgraph",
    project_urls={
        "Bug Reports": "https://github.com/alxvasilevvv/meeet-solana-state/issues",
        "Source": "https://github.com/alxvasilevvv/meeet-solana-state",
        "Documentation": "https://meeet.world/trust-api",
    },
)
