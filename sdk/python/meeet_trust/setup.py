from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="meeet-trust",
    version="0.1.0",
    description="MEEET Trust Guard — AI agent trust verification for CrewAI, AutoGen, LangGraph",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="MEEET World",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    project_urls={
        "Documentation": "https://meeet.world/trust-api",
        "Website": "https://meeet.world",
    },
    packages=find_packages(),
    python_requires=">=3.7",
    install_requires=[],
    extras_require={
        "crewai": ["crewai>=0.50.0"],
        "autogen": ["pyautogen>=0.2.0"],
        "langgraph": ["langgraph>=0.0.20"],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
    ],
    keywords="ai agent trust verification meeet crewai autogen langgraph security",
)
