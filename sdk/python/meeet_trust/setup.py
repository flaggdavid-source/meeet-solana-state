from setuptools import setup, find_packages

setup(
    name="meeet-trust",
    version="0.1.0",
    description="MEEET Trust Guard — Verify agent trust before AI agent actions",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="MEEET Team",
    author_email="contact@meeet.world",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    packages=find_packages(),
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
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
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
)
