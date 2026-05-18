import { render } from "solid-js/web";

export const HelloWorld = async (element: HTMLElement) => {
  return render(() => <h1 class="hello">Hello world</h1>, element);
};
