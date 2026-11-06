describe("toolchain", () => {
  it("runs tests in a DOM environment", () => {
    expect(typeof document.createElement).toBe("function");
  });
});
