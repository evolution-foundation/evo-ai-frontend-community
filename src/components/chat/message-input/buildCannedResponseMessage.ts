// Builds the editor message when a canned response is selected.
// The editor's getContent() returns HTML (e.g. "<p>/</p>"), so locating the
// trigger slash with lastIndexOf('/') over the HTML matched the slash in the
// closing </p> tag and dropped the canned content (EVO-1685). Operate on the
// plain text so the '/' the user typed is found correctly.
export function buildCannedResponseMessage(currentHtml: string, content: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = currentHtml;
  const text = wrapper.textContent || '';

  const slashIndex = text.lastIndexOf('/');
  return slashIndex >= 0 ? text.substring(0, slashIndex) + content : content;
}
