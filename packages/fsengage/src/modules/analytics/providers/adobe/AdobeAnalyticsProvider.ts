import AnalyticsProvider, * as Events from '../AnalyticsProvider';
type AnalyticsProviderConfiguration = import ('../types/AnalyticsProviderConfiguration').default;
type Dictionary<T = any> = import ('@brandingbrand/fsfoundation').Dictionary<T>;
type Arguments<F> = import ('@brandingbrand/fsfoundation').Arguments<F>;

export interface AdobeAnalyticsAPIAdapter {
  init: (debug?: boolean) => void;
  trackState: (state: string, contextData?: Dictionary) => void;
  trackAction: (action: string, contextData?: Dictionary) => void;
  trackVideo: (action: string, settings?: Dictionary) => void;
  trackTimedActionStart: (action: string, contextData?: Dictionary) => void;
  trackTimedActionUpdate: (action: string, contextData?: Dictionary) => void;
  trackTimedActionEnd: (action: string) => void;
}

type GenericProduct =
  Events.ImpressionProduct | Events.Product | Events.RefundProduct | Events.TransactionProduct;
type ProviderMethods = keyof AdobeAnalyticsProvider;
type EventNormalizers = {
  [key in ProviderMethods]?: (...args: Arguments<AdobeAnalyticsProvider[key]>) => ContextData;
};
interface ContextData extends Dictionary<string> {
  hitName: string;
  hitType: 'trackAction' | 'trackState';
}
export interface AdapterConfig {
  debug?: boolean;
  eventNormalizers?: EventNormalizers;
}

export class AdobeAnalyticsProvider extends AnalyticsProvider {
  public static serializeProducts(products: GenericProduct[]): string {
    const serialized = products.map(AdobeAnalyticsProvider.serializeProduct);
    return serialized.join(',');
  }

  public static serializeProduct(product: GenericProduct): string {
    const { category = '', name = '', quantity = '', price = '' } = product;
    return [category, name, quantity, price].join(';');
  }

  protected normalizers: EventNormalizers;
  protected client: AdobeAnalyticsAPIAdapter;
  constructor(
    commonConfiguration: AnalyticsProviderConfiguration,
    rnAdobeAnalytics: AdobeAnalyticsAPIAdapter,
    config: AdapterConfig
  ) {
    super(commonConfiguration);
    this.client = rnAdobeAnalytics;
    this.client.init(config.debug);
    this.normalizers = config.eventNormalizers || {};
  }

  clickGeneric(properties: Events.ClickGeneric): void {
    if (this.normalizers.clickGeneric) {
      const { hitName, hitType, ...contextData } = this.normalizers.clickGeneric(properties);
      this.client[hitType](hitName, contextData);
    }
  }

  contactCall(properties: Events.ContactCall): void {
    if (this.normalizers.contactCall) {
      const { hitName, hitType, ...contextData } = this.normalizers.contactCall(properties);
      this.client[hitType](hitName, contextData);
    }
  }

  contactEmail(properties: Events.ContactEmail): void {
    if (this.normalizers.contactEmail) {
      const { hitName, hitType, ...contextData } = this.normalizers.contactEmail(properties);
      this.client[hitType](hitName, contextData);
    }
  }

  impressionGeneric(properties: Events.ImpressionGeneric): void {
    if (!this.normalizers.impressionGeneric) {
      return this.genericState(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.impressionGeneric(properties);
    this.client[hitType](hitName, contextData);
  }

  locationDirections(properties: Events.LocationDirections): void {
    if (!this.normalizers.locationDirections) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.locationDirections(properties);
    this.client[hitType](hitName, contextData);
  }

  pageview(properties: Events.Screenview): void {
    if (!this.normalizers.pageview) {
      return this.genericState({ ...properties, eventAction: ''});
    }

    const { hitName, hitType, ...contextData } = this.normalizers.pageview(properties);
    this.client[hitType](hitName, contextData);
  }

  screenview(properties: Events.Screenview): void {
    if (!this.normalizers.screenview) {
      return this.genericState({ ...properties, eventAction: ''});
    }

    const { hitName, hitType, ...contextData } = this.normalizers.screenview(properties);
    this.client[hitType](hitName, contextData);
  }

  searchGeneric(properties: Events.SearchGeneric): void {
    if (!this.normalizers.searchGeneric) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.searchGeneric(properties);
    this.client[hitType](hitName, contextData);
  }

  addProduct(properties: Events.Product): void {
    if (!this.normalizers.addProduct) {
      const { eventCategory, eventAction } = properties;
      const actionName = this.generateActionName(eventCategory, eventAction);
      const contextData = {
        '&&products': AdobeAnalyticsProvider.serializeProduct(properties)
      };

      return this.client.trackAction(actionName, contextData);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.addProduct(properties);
    this.client[hitType](hitName, contextData);
  }

  checkout(properties: Events.Checkout, action: Events.CheckoutAction): void {
    if (!this.normalizers.checkout) {
      const { eventCategory, eventAction } = properties;
      const actionName = this.generateActionName(eventCategory, eventAction);
      const contextData = {
        '&&products': AdobeAnalyticsProvider.serializeProducts(properties.products)
      };

      return this.client.trackState(actionName, contextData);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.checkout(properties, action);
    this.client[hitType](hitName, contextData);
  }

  checkoutOption(properties: Events.Generics, action: Events.CheckoutAction): void {
    if (!this.normalizers.checkoutOption) {
      return this.genericState(properties);
    }

    const { hitName, hitType, ...ctxData } = this.normalizers.checkoutOption(properties, action);
    this.client[hitType](hitName, ctxData);
  }

  clickProduct(properties: Events.Product, action?: Events.ProductAction): void {
    if (!this.normalizers.clickProduct) {
      const { eventCategory, eventAction } = properties;
      const actionName = this.generateActionName(eventCategory, eventAction);
      const contextData = {
        '&&products': AdobeAnalyticsProvider.serializeProduct(properties)
      };

      return this.client.trackAction(actionName, contextData);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.clickProduct(properties, action);
    this.client[hitType](hitName, contextData);
  }

  clickPromotion(properties: Events.Promotion): void {
    if (!this.normalizers.clickPromotion) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.clickPromotion(properties);
    this.client[hitType](hitName, contextData);
  }

  impressionProduct(properties: Events.ImpressionProduct): void {
    if (!this.normalizers.impressionProduct) {
      const { eventCategory, eventAction } = properties;
      const actionName = this.generateActionName(eventCategory, eventAction);
      const contextData = {
        '&&products': AdobeAnalyticsProvider.serializeProduct(properties)
      };

      return this.client.trackState(actionName, contextData);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.impressionProduct(properties);
    this.client[hitType](hitName, contextData);
  }

  impressionPromotion(properties: Events.Promotion): void {
    if (!this.normalizers.impressionPromotion) {
      return this.genericState(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.impressionPromotion(properties);
    this.client[hitType](hitName, contextData);
  }

  detailProduct(properties: Events.Product, action?: Events.ProductAction): void {
    if (!this.normalizers.detailProduct) {
      return this.genericState(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.detailProduct(properties, action);
    this.client[hitType](hitName, contextData);
  }

  purchase(properties: Events.Transaction, action: Events.TransactionAction): void {
    if (!this.normalizers.purchase) {
      const contextData = {
        '&&products': AdobeAnalyticsProvider.serializeProducts(properties.products),
        purchaseId: action.identifier,
        purchase: 1
      };

      return this.client.trackAction('purchase', contextData);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.purchase(properties, action);
    this.client[hitType](hitName, contextData);
  }

  refundAll(properties: Events.Generics, action: Events.TransactionAction): void {
    if (!this.normalizers.refundAll) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.refundAll(properties, action);
    this.client[hitType](hitName, contextData);
  }

  refundPartial(properties: Events.TransactionRefund, action: Events.TransactionAction): void {
    if (!this.normalizers.refundPartial) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.refundPartial(properties, action);
    this.client[hitType](hitName, contextData);
  }

  removeProduct(properties: Events.Product): void {
    if (!this.normalizers.removeProduct) {
      return this.genericAction(properties);
    }

    const { hitName, hitType, ...contextData } = this.normalizers.removeProduct(properties);
    this.client[hitType](hitName, contextData);
  }

  lifecycle(properties: Events.App): void { /** noop - Adobe SDK captures this already */}

  protected generateActionName(eventCategory: string, eventAction: string = ''): string {
    return `${eventAction} ${eventCategory}`;
  }

  protected genericAction(properties: Events.Generics): void {
    const { eventCategory, eventAction } = properties;
    const actionName = this.generateActionName(eventCategory, eventAction);
    this.client.trackAction(actionName);
  }

  protected genericState(properties: Events.Generics): void {
    const { eventCategory, eventAction } = properties;
    const actionName = this.generateActionName(eventCategory, eventAction);
    this.client.trackState(actionName);
  }
}
