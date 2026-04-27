"""Async client for Gemma models via OpenRouter API."""

import json
import re
from typing import AsyncGenerator, Optional

import httpx

from ..config import settings


class GemmaClient:
    """Async client for interacting with Gemma models via OpenRouter.
    
    Supports:
    - Streaming responses (SSE events)
    - Thinking mode (uses provider ordering for Google)
    - Extraction of thinking traces from <think> tags
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        """Initialize the Gemma client.
        
        Args:
            api_key: OpenRouter API key. Defaults to settings.openrouter_api_key.
            base_url: OpenRouter base URL. Defaults to settings.openrouter_base_url.
        """
        self.api_key = api_key or settings.openrouter_api_key
        self.base_url = base_url or settings.openrouter_base_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client.
        
        Returns:
            Configured httpx.AsyncClient instance.
        """
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=httpx.Timeout(60.0, connect=10.0)
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def generate(
        self,
        prompt: str,
        model_name: str,
        max_tokens: int = 500,
        streaming: bool = True,
        thinking_mode: bool = True
    ) -> AsyncGenerator[str, None]:
        """Generate a response from the Gemma model.
        
        Args:
            prompt: The input prompt for the model.
            model_name: The model identifier (e.g., "google/gemma-4-e2b-it").
            max_tokens: Maximum tokens to generate.
            streaming: Whether to use streaming mode.
            thinking_mode: Whether to enable thinking mode (provider ordering).
            
        Yields:
            String chunks of the streaming response.
        """
        client = await self._get_client()
        
        # Build request payload
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "stream": streaming
        }
        
        # Add thinking mode configuration
        if thinking_mode:
            payload["extra_body"] = {
                "provider": {
                    "order": ["google"]
                }
            }
        
        async with client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            
            thinking_buffer = ""
            content_buffer = ""
            in_thinking = False
            
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                    
                data = line[6:]  # Remove "data: " prefix
                
                if data == "[DONE]":
                    break
                
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                
                # Extract content delta
                if "choices" in chunk and len(chunk["choices"]) > 0:
                    delta = chunk["choices"][0].get("delta", {})
                    
                    # Check for thinking content
                    if "thinking" in delta:
                        thinking_content = delta["thinking"]
                        thinking_buffer += thinking_content
                        yield thinking_content
                    
                    # Check for content
                    if "content" in delta:
                        content = delta["content"]
                        content_buffer += content
                        yield content

    async def generate_structured(
        self,
        prompt: str,
        model_name: str,
        max_tokens: int = 500,
        thinking_mode: bool = True
    ) -> tuple[Optional[dict], str]:
        """Generate a structured JSON response from the model.
        
        Args:
            prompt: The input prompt.
            model_name: The model identifier.
            max_tokens: Maximum tokens to generate.
            thinking_mode: Whether to enable thinking mode.
            
        Returns:
            Tuple of (parsed JSON dict or None, thinking_trace string).
        """
        thinking_trace = ""
        full_response = ""
        
        # Collect the full response
        async for chunk in self.generate(
            prompt, model_name, max_tokens, streaming=True, thinking_mode=thinking_mode
        ):
            full_response += chunk
        
        # Extract thinking trace from <think> tags
        thinking_match = re.search(
            r"<think>(.*?)</think>",
            full_response,
            re.DOTALL
        )
        if thinking_match:
            thinking_trace = thinking_match.group(1).strip()
        
        # Extract JSON from the response
        json_response = self._extract_json(full_response)
        
        return json_response, thinking_trace

    def _extract_json(self, text: str) -> Optional[dict]:
        """Extract JSON object from model output text.
        
        Handles cases where the model wraps JSON in markdown code blocks
        or has other surrounding text.
        
        Args:
            text: The full model output text.
            
        Returns:
            Parsed JSON dict or None if extraction fails.
        """
        # Try direct JSON parsing first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON in code blocks
        code_block_match = re.search(
            r"```(?:json)?\s*(\{.*?\})\s*```",
            text,
            re.DOTALL
        )
        if code_block_match:
            try:
                return json.loads(code_block_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find any JSON object in the text
        json_match = re.search(
            r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}",
            text,
            re.DOTALL
        )
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        
        return None


# Global Gemma client instance
gemma_client = GemmaClient()
