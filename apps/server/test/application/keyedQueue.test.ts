import { describe, expect, it } from "vitest";
import { KeyedQueue } from "../../src/application/concurrency/keyedQueue.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("KeyedQueue", () => {
  it("ejecuta en serie las tareas de la misma clave", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    const task = (name: string) => async () => {
      log.push(`${name}:start`);
      await tick();
      log.push(`${name}:end`);
      return name;
    };
    const results = await Promise.all([
      queue.run("match-1", task("a")),
      queue.run("match-1", task("b")),
      queue.run("match-1", task("c")),
    ]);
    expect(results).toEqual(["a", "b", "c"]);
    expect(log).toEqual(["a:start", "a:end", "b:start", "b:end", "c:start", "c:end"]);
  });

  it("claves distintas no se bloquean entre sí", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    await Promise.all([
      queue.run("x", async () => { log.push("x:start"); await tick(); log.push("x:end"); }),
      queue.run("y", async () => { log.push("y:start"); await tick(); log.push("y:end"); }),
    ]);
    expect(log.indexOf("y:start")).toBeLessThan(log.indexOf("x:end"));
  });

  it("un error no bloquea las tareas siguientes", async () => {
    const queue = new KeyedQueue();
    const failing = queue.run("k", async () => { throw new Error("boom"); });
    const next = queue.run("k", async () => "ok");
    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
  });
});
