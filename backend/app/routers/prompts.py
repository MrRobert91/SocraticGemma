"""Prompt management endpoints."""

import os
import yaml
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from ..schemas import PromptInfo

router = APIRouter(prefix="/prompts", tags=["prompts"])

# Path to prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Prompt descriptions
PROMPT_DESCRIPTIONS = {
    "baseline": "Non-Socratic baseline prompt for comparison",
    "system_base": "Core identity and guiding principles for Socratic facilitation",
    "age_6_8": "Communication guidelines for children aged 6-8",
    "age_9_12": "Communication guidelines for children aged 9-12",
    "age_13_16": "Communication guidelines for children aged 13-16",
    "question_types": "P4C question types and rotation strategy",
    "forbidden_rules": "Rules for detecting forbidden behaviors",
    "output_format": "Expected output format for model responses"
}


@router.get(
    "",
    response_model=list[PromptInfo],
    summary="List available prompts",
    description="Returns all available prompt templates."
)
async def list_prompts() -> list[PromptInfo]:
    """List all available prompt templates.
    
    Returns:
        List of PromptInfo objects with name, description, and content.
    """
    prompts = []
    
    if not PROMPTS_DIR.exists():
        return prompts
    
    for yaml_file in sorted(PROMPTS_DIR.glob("*.yaml")):
        name = yaml_file.stem
        description = PROMPT_DESCRIPTIONS.get(name, f"Prompt: {name}")
        
        try:
            with open(yaml_file, "r") as f:
                content = f.read()
        except Exception:
            content = ""
        
        prompts.append(PromptInfo(
            name=name,
            description=description,
            content=content
        ))
    
    return prompts


@router.get(
    "/{name}",
    response_model=PromptInfo,
    summary="Get prompt by name",
    description="Returns a specific prompt template by name."
)
async def get_prompt(name: str) -> PromptInfo:
    """Get a specific prompt by name.
    
    Args:
        name: The prompt name (without .yaml extension).
        
    Returns:
        PromptInfo with full prompt content.
        
    Raises:
        HTTPException: If prompt not found.
    """
    yaml_file = PROMPTS_DIR / f"{name}.yaml"
    
    if not yaml_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{name}' not found"
        )
    
    description = PROMPT_DESCRIPTIONS.get(name, f"Prompt: {name}")
    
    try:
        with open(yaml_file, "r") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading prompt file: {str(e)}"
        )
    
    return PromptInfo(
        name=name,
        description=description,
        content=content
    )
