declare interface Window {
  gapi: {
    load(
      apiName: string,
      callback: () => void
    ): void;
    client: {
      init(config: {
        clientId: string;
        scope: string;
      }): Promise<void>;
    };
    auth2: {
      getAuthInstance(): {
        isSignedIn: {
          get(): boolean;
        };
        signIn(): Promise<void>;
        currentUser: {
          get(): {
            getAuthResponse(): {
              access_token: string;
            };
          };
        };
      };
    };
  };
} 