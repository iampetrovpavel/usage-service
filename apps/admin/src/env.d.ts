/// <reference types="vite/client" />

declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string;
  }
  function initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
  }): void;
  function renderButton(
    element: HTMLElement,
    config: {
      theme?: string;
      size?: string;
      width?: number;
      text?: string;
    }
  ): void;
}
