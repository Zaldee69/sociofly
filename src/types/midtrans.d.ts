declare module "midtrans-client" {
  interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  class Snap {
    constructor(config?: SnapConfig);
    createTransaction(parameter: any): Promise<any>;
  }

  export { Snap };
}
