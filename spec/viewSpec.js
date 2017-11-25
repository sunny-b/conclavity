// describe("updateShareLink", () => {
//   let controller, mockDoc, link;
//
//   beforeEach(() => {
//     controller = new Controller(targetPeerId, host, mockPeer, mockBroadcast, mockEditor);
//     mockDoc = new JSDOM(`<!DOCTYPE html><a id="myLink"></a>`).window.document;
//     link = mockDoc.querySelector("#myLink").textContent;
//   })
//
//   it("changes the link value", () => {
//     controller.updateShareLink(targetPeerId, mockDoc);
//     const updatedLink = mockDoc.querySelector("#myLink").textContent;
//
//     expect(link).not.toEqual(updatedLink);
//   });
//
//   it("sets the link's text content", () => {
//     controller.updateShareLink(targetPeerId, mockDoc);
//     const updatedLink = mockDoc.querySelector("#myLink").textContent;
//     expect(updatedLink).toEqual(host+"/?id=" + targetPeerId);
//   });
//
//   it("sets the link's href attribute", () => {
//     controller.updateShareLink(targetPeerId, mockDoc);
//     const href = mockDoc.querySelector("#myLink").getAttribute('href');
//     expect(href).toEqual(host+"/?id=" + targetPeerId);
//   });
// });
