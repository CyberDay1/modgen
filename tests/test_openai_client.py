import io
import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from modgen.openai_client import OpenAIAPIError, OpenAIClient
from modgen.prompt import PromptMessage, StructuredPrompt


class OpenAIClientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.prompt = StructuredPrompt(
            model="gpt-test",
            messages=[
                PromptMessage(role="system", content="You are a helper."),
                PromptMessage(role="user", content="Say hi"),
            ],
        )

    @patch("modgen.openai_client.urlopen")
    def test_create_chat_completion(self, mock_urlopen: MagicMock) -> None:
        response_payload = {
            "id": "chatcmpl-123",
            "model": "gpt-test",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello there!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12},
        }
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(response_payload).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_response.getcode.return_value = 200
        mock_response.status = 200
        mock_urlopen.return_value = mock_response

        client = OpenAIClient(api_key="test-key")
        result = client.create_chat_completion(self.prompt)

        self.assertEqual(result.id, "chatcmpl-123")
        self.assertEqual(result.choices[0].message.content, "Hello there!")
        self.assertEqual(result.usage.total_tokens, 12)

    @patch("modgen.openai_client.urlopen")
    def test_create_chat_completion_handles_http_error(self, mock_urlopen: MagicMock) -> None:
        error = HTTPError(
            url="https://api.openai.com/v1/chat/completions",
            code=500,
            msg="Server error",
            hdrs=None,
            fp=io.BytesIO(b"{\"error\":{\"message\":\"failure\"}}"),
        )
        mock_urlopen.side_effect = error
        client = OpenAIClient(api_key="test-key")
        with self.assertRaises(OpenAIAPIError):
            client.create_chat_completion(self.prompt)

    @patch("modgen.openai_client.urlopen")
    def test_create_chat_completion_invalid_json(self, mock_urlopen: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.read.return_value = b"not-json"
        mock_response.__enter__.return_value = mock_response
        mock_response.getcode.return_value = 200
        mock_response.status = 200
        mock_urlopen.return_value = mock_response

        client = OpenAIClient(api_key="test-key")
        with self.assertRaises(OpenAIAPIError):
            client.create_chat_completion(self.prompt)


if __name__ == "__main__":
    unittest.main()
