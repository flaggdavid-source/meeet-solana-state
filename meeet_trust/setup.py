from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="meeet-trust",
    version="0.1.0",
    description="MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="MEEET World",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    project_urls={
        "Documentation": "https://meeet.world/trust-api",
        "Website": "https://meeet.world",
        "GitHub": "https://github.com/alxvasilevvv/meeet-solana-state",
    },
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies - uses only stdlib
    ],
    extras_require={
        "crewai": ["crewai>=0.50.0"],
        "autogen": ["pyautogen>=0.2.0"],
        "langgraph": ["langgraph>=0.0.20"],
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-mock>=3.10.0",
            "httpx>=0.24.0",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Artificial Intelligence",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: 3.9",
        "Programming Language :: 3.10",
        "Programming Language :: 3.11",
        "Programming Language :: 3.12",
    ],
    keywords="ai agent trust meeet crewai autogen langgraph security verification",
    entry_points={
        "console_scripts": [
            "meeet-trust=meeet_trust.cli:main",
        ],
    },
)
