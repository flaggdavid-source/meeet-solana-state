"""Setup for meeet_trust package."""

from setuptools import setup, find_packages

setup(
    name="meeet-trust",
    version="0.1.0",
    description="MEEET Trust Guard - AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph",
    long_description=open("README.md").read() if __name__ == "__main__" else "",
    long_description_content_type="text/markdown",
    author="MEEET World",
    author_email="dev@meeet.world",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "crewai": ["crewai>=0.50.0"],
        "autogen": ["pyautogen>=0.2.0"],
        "langgraph": ["langgraph>=0.0.20"],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    keywords="ai agents trust verification meeet crewai autogen langgraph",
)
