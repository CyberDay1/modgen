# modgen

## Development

```bash
npm install
npm run dev
```

The development server runs the Vite renderer and Electron main process in parallel. The renderer serves from `http://localhost:5173` in development.

## Production build

```bash
npm run build
```

The build step outputs the renderer bundle to `dist/renderer` and the Electron main and preload scripts to `dist/main` using esbuild.
Utilities to work with the OpenAI API using structured chat prompts. The
package avoids external dependencies and offers a small layer above the HTTP API
so that prompts and responses are represented using Python data classes.

## Usage

```python
from modgen import OpenAIClient, PromptMessage, StructuredPrompt

client = OpenAIClient(api_key="sk-...", organization="org-id")
prompt = StructuredPrompt(
    model="gpt-4o-mini",
    messages=[
        PromptMessage(role="system", content="You are a helpful assistant."),
        PromptMessage(role="user", content="Write a haiku about testing."),
    ],
    temperature=0.3,
)

response = client.create_chat_completion(prompt)
print(response.first_message().content)
```

## Testing

```bash
python -m unittest discover -s tests
```

## Environment Variables

Set `OPENAI_API_KEY` in your runtime environment and pass it to
`OpenAIClient`. Additional OpenAI headers such as `OpenAI-Organization` and
`OpenAI-Project` can be configured via the constructor.
