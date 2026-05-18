# Context

## Demos

- [ ] comments with selection
- [ ] multiple diffs
- [ ] embark / potluck
- [ ] selection across documents

## Examples

### Repo

```tsx
const withDoc = (mount) => {
  return (element) => {
    const url = element.getAttribute("url");
    const handle = requestHandle(request, Doc(url));

    return mount({ handle, request, element });
  };
};
```

### Comments

```tsx tool
const TodoTool = withDoc(({ request, handle, element }) => {
 const [comments, changeComments] = request(Comments)
 const [selection, changeSelection] = request(Selection)
 const changes = request(Diff(url))

 const todos = makeDocProjection(handle)

 <For each={todos}>
  {(todo) => {
    return (
        // check comments to render
    )
  }}
 </For>

})
```

```tsx sidebar
  
```

```tsx comments provider

const Comments = {
  type: "comments"
}

const CommentsProvider = withDocHandle({ element, request, handle }) => {
  const commentsByDoc = handle
  const handlesByDocUrl = {}

  element.on("patchwork:mount", async (event) => {
    const url = event.details.url

    handlesByDocUrl[url] = await request(DocHandle(event.details.url))
  }) 99

  element.on("provider:request", (event) => {
    if (event.details.type === "comments") {
      respond(event, commentsByDoc[event.target.docUrl)
    }
  })
}
```

```
const Selection = withDocHandle(({element, handle}) => {

  ...

})
```

**Multiple Diffs**

How can you show potential edits of an llm in the current context

```
const BranchProvider = withDocHandle(({ handle }) => {

})
```

```
type BranchState = {
  mainBranch: []
  layers: []
}


const Branch = withDocHandle(({}) => {
  const [branch, ] = await request(Branch)

})
```

<div>
  <LLMEditor doc-url={currentDocUrl}>
  <PatchworkView doc-url={currentDocUrl}>
</div>

** embark / potluck **

Seems trivial, the interesting thing here is how permissive / restrictive are you

```
const SearchProvider = () => {

}
```

```
const GeoLocationProvider = () => {


}
```

\*\* selection across component &&

type SelectionState = {
isSelecting: boolean
}

const SelectionProvider = (element) => {
const selectionHandleByElement = {}

const selectableElements = {}

// do on mount to capture all elements that are mounted

}

const Spreadsheet = withContext(() => {
const selectionHandle = request(ElementSelection)

selectionHandle.change(true)

selectionHandle.on("hover", ({ element }) => {

  element

})

})
