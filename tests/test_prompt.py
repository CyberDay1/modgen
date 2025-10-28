import unittest

from modgen.prompt import PromptMessage, PromptValidationError, StructuredPrompt


class StructuredPromptTests(unittest.TestCase):
    def test_prompt_message_invalid_role(self) -> None:
        with self.assertRaises(PromptValidationError):
            PromptMessage(role="invalid", content="hello")

    def test_structured_prompt_payload(self) -> None:
        prompt = StructuredPrompt(
            model="gpt-test",
            messages=[
                PromptMessage(role="system", content="You are a test."),
                PromptMessage(role="user", content="Say hello"),
            ],
            temperature=0.2,
            max_tokens=10,
            response_format={"type": "json_object"},
            extra_parameters={"presence_penalty": 0.5},
        )

        payload = prompt.to_payload()
        self.assertEqual(payload["model"], "gpt-test")
        self.assertEqual(payload["temperature"], 0.2)
        self.assertEqual(payload["max_tokens"], 10)
        self.assertEqual(payload["response_format"], {"type": "json_object"})
        self.assertEqual(payload["presence_penalty"], 0.5)

    def test_structured_prompt_disallows_reserved_extra_parameters(self) -> None:
        with self.assertRaises(PromptValidationError):
            StructuredPrompt(
                model="gpt-test",
                messages=[PromptMessage(role="user", content="Hi")],
                extra_parameters={"model": "override"},
            )


if __name__ == "__main__":
    unittest.main()
