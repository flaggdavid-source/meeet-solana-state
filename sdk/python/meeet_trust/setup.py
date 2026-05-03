from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="meeet-trust",
    version="0.1.0",
    description="MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, LangGraph",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="MEEET World",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    project_urls={
        "Documentation": "https://meeet.world/developer",
        "Website": "https://meeet.world",
        "GitHub": "https://github.com/alxvasilevvv/meeet-solana-state",
    },
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies - uses stdlib only
    ],
    extras_require={
        "crewai": ["crewai>=0.50.0"],
        "autogen": ["pyautogen>=0.2.0"],
        "langgraph": ["langgraph>=0.0.20"],
        "dev": ["pytest", "pytest-mock", "responses"],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    keywords="ai agent trust verification meeet crewai autogen langgraph sara risk",
    entry_points={
        "console_scripts": [
            "meeet-trust=meeet_trust.cli:main",
        ],
    },
)
