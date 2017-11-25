import { JSDOM } from 'jsdom';
import UUID from 'uuid/v1';
import Editor from '../lib/editor';

describe("Editor", () => {
  const mockMDE = {
    codemirror: {
      setOption: function() {},
      on: function() {}
    }
  };
  const editor = new Editor(mockMDE, UUID());

  describe("constructor", () => {
    it("sets the mde passed in to the.mde", () => {
      expect(editor.mde).toEqual(mockMDE);
    });
  });

  describe("bindChangeEvent", () => {
    it("is triggered by a change in the codemirror", () => {
      spyOn(mockMDE.codemirror, "on");
      new Editor(mockMDE, UUID());
      expect(mockMDE.codemirror.on).toHaveBeenCalled();
    });

    it("changes the character text to a new line");

    it("calls controller.handleInsert when change was an insert");

    it("calls controller.handleDelete when change was a deletion");
  });

});
