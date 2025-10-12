import '@emotion/react';

declare module '@emotion/react' {
  export interface Theme {
    // Empty theme for now, can be extended later
  }
}

declare global {
  namespace JSX {
    interface Element extends React.JSX.Element {}
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicElements {
      [elemName: string]: any;
    }

    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}

    interface IntrinsicAttributes extends React.Attributes {}
  }
}

// Extend React HTML elements to include the css prop
declare module 'react' {
  interface HTMLAttributes<T> extends React.HTMLAttributes<T> {
    css?: import('@emotion/react').SerializedStyles;
  }
  interface SVGProps<T> extends React.SVGProps<T> {
    css?: import('@emotion/react').SerializedStyles;
  }
}
