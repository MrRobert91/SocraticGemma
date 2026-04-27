"""Comparison endpoints for baseline vs P4C prompts."""

import asyncio
import json
import time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..schemas import CompareResponse
from ..services.session_store import session_store
from ..services.gemma_client import gemma_client
from ..services.evaluator import evaluator
from ..config import settings

router = APIRouter(prefix="/compare", tags=["compare"])


class CompareRequest(BaseModel):
    """Request to compare baseline vs P4C prompts."""
    child_input: str = Field(description="The child's input to compare responses for")
    age_group: str = Field(description="Age group: '6-8', '9-12', or '13-16'")
    model_size: str = Field(default="fast", description="Model size: 'fast' or 'accurate'")
    thinking_mode: bool = Field(default=True, description="Enable thinking mode")


# Simple baseline prompt (non-Socratic)
BASELINE_PROMPT = """You are a helpful assistant for children. 
A {age}-year-old child says: "{input}"

Provide a helpful, clear response appropriate for their age.
"""


# P4C system prompt
P4C_PROMPT = """You are a Philosophy for Children (P4C) facilitator working with children. 
Your role is to guide philosophical inquiry through dialogue, never by giving direct answers.

Core principles:
- NEVER give direct answers - always respond with another question
- Guide children to think for themselves
- Embrace puzzlement and uncertainty
- Build on children's natural curiosity

A {age}-year-old child says: "{input}"

Respond as a Socratic facilitator would, asking questions that deepen thinking.
"""


@router.post(
    "",
    response_model=CompareResponse,
    summary="Compare baseline vs P4C responses",
    description="Runs both baseline and P4C prompts on the same input and compares scores."
)
async def compare_responses(request: CompareRequest) -> CompareResponse:
    """Compare baseline (non-Socratic) vs P4C (Socratic) responses.
    
    Runs the same child input through both prompt types and returns
    evaluation scores for each, along with improvement percentage.
    
    Args:
        request: CompareRequest with child_input, age_group, and options.
        
    Returns:
        CompareResponse with both responses and improvement percentage.
    """
    # Determine age description
    age_map = {"6-8": "6-8 year old", "9-12": "9-12 year old", "13-16": "13-16 year old"}
    age_desc = age_map.get(request.age_group, request.age_group)
    
    # Build prompts
    baseline_prompt = BASELINE_PROMPT.format(age=age_desc, input=request.child_input)
    p4c_prompt = P4C_PROMPT.format(age=age_desc, input=request.child_input)
    
    # Get model
    model_name = (
        "google/gemma-4-27b-it" if request.model_size == "accurate"
        else "google/gemma-4-e2b-it"
    )
    
    # Generate baseline response
    baseline_content = ""
    async for chunk in gemma_client.generate(
        prompt=baseline_prompt,
        model_name=model_name,
        max_tokens=300,
        streaming=True,
        thinking_mode=request.thinking_mode
    ):
        if chunk and "<think>" not in chunk:
            baseline_content += chunk
    
    # Generate P4C response
    p4c_content = ""
    async for chunk in gemma_client.generate(
        prompt=p4c_prompt,
        model_name=model_name,
        max_tokens=300,
        streaming=True,
        thinking_mode=request.thinking_mode
    ):
        if chunk and "<think>" not in chunk:
            p4c_content += chunk
    
    # Evaluate both in parallel
    baseline_task = asyncio.create_task(
        evaluator.evaluate(
            child_input=request.child_input,
            model_response=baseline_content,
            age_group=request.age_group
        )
    )
    p4c_task = asyncio.create_task(
        evaluator.evaluate(
            child_input=request.child_input,
            model_response=p4c_content,
            age_group=request.age_group
        )
    )
    
    baseline_scores, baseline_forbidden = await baseline_task
    p4c_scores, p4c_forbidden = await p4c_task
    
    # Calculate improvement percentage
    baseline_weighted = baseline_scores.weighted_overall()
    p4c_weighted = p4c_scores.weighted_overall()
    
    if baseline_weighted > 0:
        improvement_pct = round(
            ((p4c_weighted - baseline_weighted) / baseline_weighted) * 100,
            1
        )
    else:
        improvement_pct = 0.0
    
    return CompareResponse(
        base_response={
            "content": baseline_content,
            "scores": {
                "socratism": baseline_scores.socratism,
                "age_fit": baseline_scores.age_fit,
                "builds_on": baseline_scores.builds_on,
                "openness": baseline_scores.openness,
                "advancement": baseline_scores.advancement,
                "overall": baseline_scores.overall,
                "weighted_overall": baseline_weighted
            },
            "forbidden_behaviors": baseline_forbidden
        },
        p4c_response={
            "content": p4c_content,
            "scores": {
                "socratism": p4c_scores.socratism,
                "age_fit": p4c_scores.age_fit,
                "builds_on": p4c_scores.builds_on,
                "openness": p4c_scores.openness,
                "advancement": p4c_scores.advancement,
                "overall": p4c_scores.overall,
                "weighted_overall": p4c_weighted
            },
            "forbidden_behaviors": p4c_forbidden
        },
        improvement_pct=improvement_pct
    )
