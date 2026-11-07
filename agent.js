/**
 * Simple multi-step agent loop (inspired by smolagents-js patterns).
 * Runs entirely in the browser. No backend required.
 */
export class Agent {
  constructor({ model, tools = [], maxSteps = 8, onEvent } = {}) {
    this.model = model;
    this.tools = tools;
    this.maxSteps = maxSteps;
    this.onEvent = onEvent || (() => {});
    this.history = [];
  }

  async run(task) {
    this.history = [{ role: "user", content: task }];
    this.emit("start", { task });

    for (let step = 1; step <= this.maxSteps; step++) {
      this.emit("step", { step });

      const response = await this.model(this.history, this.tools);
      this.history.push({ role: "assistant", content: response });

      const toolCall = this.parseToolCall(response);
      if (!toolCall) {
        this.emit("done", { result: response });
        return response;
      }

      this.emit("tool", { name: toolCall.name, args: toolCall.args });
      const tool = this.tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        const err = `Unknown tool: ${toolCall.name}`;
        this.history.push({ role: "tool", content: err });
        this.emit("tool-result", { name: toolCall.name, error: err });
        continue;
      }

      try {
        const result = await tool.run(toolCall.args);
        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        this.history.push({ role: "tool", name: toolCall.name, content: text });
        this.emit("tool-result", { name: toolCall.name, result: text });
      } catch (err) {
        const msg = err.message || String(err);
        this.history.push({ role: "tool", name: toolCall.name, content: `Error: ${msg}` });
        this.emit("tool-result", { name: toolCall.name, error: msg });
      }
    }

    const final = "Reached max steps.";
    this.emit("done", { result: final });
    return final;
  }

  parseToolCall(text) {
    const match = text.match(/<tool>([\s\S]*?)<\/tool>/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.args) return parsed;
    } catch {}
    return null;
  }

  emit(type, data) {
    this.onEvent({ type, ...data });
  }
}
