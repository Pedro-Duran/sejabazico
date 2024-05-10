import {
  i19addToCart,
  i19additionalComments,
  i19buyAlsoMsg,
  i19checkout,
  i19orderNotesInputMsg,
  i19proceed,
  i19selectedOffers
} from '@ecomplus/i18n'

import {
  i18n,
  name,
  formatMoney,
  price,
  img
} from '@ecomplus/utils'

import ecomCart from '@ecomplus/shopping-cart'
import scrollToElement from '#components/js/helpers/scroll-to-element'
import baseModulesRequestData from '@ecomplus/storefront-app/src/lib/base-modules-request-data'
import DiscountApplier from '#components/DiscountApplier.vue'
import PointsApplier from '#components/PointsApplier.vue'
import LoginBlock from '#components/LoginBlock.vue'
import ShippingCalculator from '#components/ShippingCalculator.vue'
import ShippingLine from '#components/ShippingLine.vue'
import RecommendedItems from '#components/RecommendedItems.vue'
import PaymentMethods from '@ecomplus/storefront-app/src/components/PaymentMethods.vue'
import AccountForm from '#components/AccountForm.vue'
import AccountAddresses from '#components/AccountAddresses.vue'
import EcSummary from '@ecomplus/storefront-app/src/components/EcSummary.vue'

import {
  Bag,
  BackToCart,
  Buyer,
  ChangeShippingMethod,
  ContactPhone,
  Continue,
  Delivery,
  Discount,
  DocNumber,
  Logout,
  MyAccount,
  Payment,
  ProceedToPayment,
  RegisterToBuy,
  Summary
} from '@ecomplus/storefront-app/src/lib/i18n'

export default {
  name: 'EcCheckout',

  components: {
    DiscountApplier,
    PointsApplier,
    LoginBlock,
    ShippingLine,
    ShippingCalculator,
    RecommendedItems,
    PaymentMethods,
    AccountForm,
    AccountAddresses,
    EcSummary
  },

  props: {
    mergeDictionary: {
      type: Object,
      default () {
        return {}
      }
    },
    cartUrl: {
      type: String,
      default: '/app/#/cart'
    },
    amount: {
      type: Object,
      default () {
        return {}
      }
    },
    customer: {
      type: Object,
      default () {
        return {}
      }
    },
    checkoutStep: {
      type: Number,
      default: 1
    },
    isGuestCheckout: {
      type: Boolean,
      default () {
        return window.ecomGuestCheckout === true
      }
    },
    canRecommendItems: {
      type: Boolean,
      default: true
    },
    canHideSummary: Boolean,
    shippingZipCode: String,
    shippingService: Object,
    skipShippingApps: {
      type: Array,
      default () {
        return []
      }
    },
    paymentGateway: Object,
    discountCoupon: String,
    notes: String,
    ecomCart: {
      type: Object,
      default () {
        return ecomCart
      }
    }
  },

  data () {
    return {
      checkoutAppId: 1,
      toCheckoutStep: this.checkoutStep,
      customerEmail: this.customer.main_email,
      isUserIdentified: Boolean(this.customer.main_email),
      editAccount: false,
      editShippingService: !this.shippingService,
      localZipCode: this.shippingZipCode,
      selectedAddressId: null,
      isEditingAddr: false,
      paymentGateways: [],
      loyaltyPointsApplied: {},
      loyaltyPointsAmount: 0,
      hasMoreOffers: false,
      hasBazicashPrices: Boolean(window.bazicashPrices),
      availableBazicash: 0
    }
  },

  computed: {
    i19addToCart: () => i18n(i19addToCart),
    i19additionalComments: () => i18n(i19additionalComments),
    i19buyAlsoMsg: () => i18n(i19buyAlsoMsg),
    i19checkout: () => i18n(i19checkout),
    i19orderNotesInputMsg: () => i18n(i19orderNotesInputMsg),
    i19proceed: () => i18n(i19proceed),
    i19selectedOffers: () => i18n(i19selectedOffers),
    modulesPayload: () => baseModulesRequestData,

    dictionary () {
      return {
        Bag,
        BackToCart,
        Buyer,
        ChangeShippingMethod,
        ContactPhone,
        Continue,
        Delivery,
        Discount,
        DocNumber,
        Logout,
        MyAccount,
        Payment,
        ProceedToPayment,
        RegisterToBuy,
        Summary,
        ...this.mergeDictionary
      }
    },

    cart () {
      return this.ecomCart.data
    },

    hasBuyerInfo () {
      const { customer } = this
      return this.customerEmail &&
        customer.name && customer.name.given_name &&
        customer.registry_type && customer.doc_number &&
        customer.phones && customer.phones.length
    },

    localCustomer: {
      get () {
        return this.customer
      },
      set (customer) {
        this.$emit('update:customer', customer)
        this.$nextTick(() => {
          this.editAccount = false
        })
      }
    },

    localDiscountCoupon: {
      get () {
        return this.discountCoupon
      },
      set (couponCode) {
        this.$emit('update:discount-coupon', couponCode)
      }
    },

    paymentAmount () {
      return {
        ...this.amount,
        total: this.amount.total - this.loyaltyPointsAmount - this.bazicashAmount
      }
    },

    localNotes: {
      get () {
        return this.notes
      },
      set (notes) {
        this.$emit('update:notes', notes)
      }
    },

    shownCheckoutStep () {
      if (!this.hasBuyerInfo || this.editAccount) {
        return this.isGuestCheckout ? 1 : 0
      } else {
        return Math.min(this.enabledCheckoutStep, this.toCheckoutStep)
      }
    },

    isBazipass () {
      return window.checkedBazipassDoc
    },

    shippingAddress () {
      const { addresses } = this.customer
      return addresses && addresses.find(addr => {
        return (this.selectedAddressId === addr._id || addr.default) &&
          Boolean(addr.street && addr.city && addr.province_code)
      })
    },

    enabledCheckoutStep () {
      return !this.hasBuyerInfo
        ? this.isGuestCheckout ? 1 : 0
        : this.shippingAddress && this.shippingService ? 2 : 1
    },

    paymentsListKey () {
      let key = 'pay'
      if (this.localDiscountCoupon) {
        key += `-${this.localDiscountCoupon}`
      }
      ;['freight', 'subtotal'].forEach(amountField => {
        if (this.amount[amountField] > 0) {
          key += `-${this.amount[amountField]}`
        }
      })
      return key
    },

    hasBazicashItem () {
      return Boolean(this.cart.items.find(({ flags }) => flags && flags.includes('bazicash')))
    },

    bazicashAmount () {
      return this.cart.items.reduce((subtotal, item) => {
        if (item.flags && item.flags.includes('bazicash')) {
          subtotal += (item.quantity * price(item))
        }
        return subtotal
      }, 0)
    },

    bazicashPoints () {
      if (!this.hasBazicashPrices && !window.bazicashPrices) {
        return 0
      }
      return this.cart.items.reduce((subtotal, item) => {
        if (item.flags && item.flags.includes('bazicash') && window.bazicashPrices) {
          subtotal += (item.quantity * window.bazicashPrices[item.product_id])
        }
        return subtotal
      }, 0)
    }
  },

  methods: {
    name,
    price,
    formatMoney,

    img (item) {
      return img(item, null, 'small')
    },

    i18n (label) {
      return i18n(this.dictionary[label])
    },

    login (ecomPassport) {
      if (ecomPassport.checkLogin()) {
        this.customerEmail = ecomPassport.getCustomer().main_email
        this.$emit('login', ecomPassport)
      }
    },

    autoMoveStep () {
      if ('activeElement' in document) {
        document.activeElement.blur()
      }
      this.$nextTick(() => {
        if (document.body.offsetWidth >= 768) {
          this.toCheckoutStep = this.enabledCheckoutStep
        } else if (this.enabledCheckoutStep && !(this.toCheckoutStep > 1)) {
          this.toCheckoutStep = 1
        }
      })
    },

    updateZipCode () {
      if (this.shippingAddress) {
        this.localZipCode = this.shippingAddress.zip
      }
    },

    selectAddress (addressId) {
      this.$emit('address-selected', addressId)
      this.selectedAddressId = addressId
      this.$nextTick(this.updateZipCode)
    },

    goToTop () {
      this.$nextTick(() => {
        scrollToElement(this.$el, -15)
      })
    },

    goToOffers () {
      scrollToElement(this.$refs.offers.$el)
    },

    selectPaymentGateway (gateway) {
      this.$emit('update:payment-gateway', gateway)
      if (this.checkoutStep === 2 && !this.paymentGateway) {
        this.goToTop()
      }
    },

    checkout (transaction) {
      if (this.loyaltyPointsAmount || this.bazicashAmount) {

        for (let i = 0; i < this.paymentGateways.length; i++) {
          if (this.paymentGateways[i].payment_method.code === 'loyalty_points' && this.paymentGateway.payment_method.code !== 'loyalty_points') {
            const pointsAmountPart = (this.loyaltyPointsAmount + this.bazicashAmount) / this.amount.total
            const loyaltyPointsApplied = { ...this.loyaltyPointsApplied }
            if (loyaltyPointsApplied.p0_pontos) {
              loyaltyPointsApplied.p0_pontos += this.bazicashPoints
            }
            return this.$emit('checkout', [{
              ...transaction,
              amount_part: 1 - pointsAmountPart
            }, {
              ...this.paymentGateways[i],
              loyalty_points_applied: this.loyaltyPointsApplied,
              amount_part: pointsAmountPart
            }])
          } else if (this.paymentGateways[i].payment_method.code === 'loyalty_points' && this.paymentGateway.payment_method.code === 'loyalty_points') {
            const loyaltyPointsApplied = { 
              p0_pontos: this.bazicashPoints
             }
            return this.$emit('checkout', [{
              ...transaction,
              loyalty_points_applied: loyaltyPointsApplied,
              amount: this.bazicashAmount
            }])
          }
        }
      }
      this.$emit('checkout', transaction)
    }
  },

  watch: {
    customerEmail (email) {
      if (email) {
        if (this.customer.main_email !== email) {
          this.$emit('update:customer', {
            ...this.customer,
            main_email: email
          })
        }
        this.isUserIdentified = true
      }
    },

    'customer.main_email' (email) {
      if (email) {
        this.customerEmail = email
      }
    },

    localZipCode () {
      this.editShippingService = true
    },

    skipShippingApps () {
      this.toCheckoutStep = 1
    },

    toCheckoutStep (stepNumber) {
      this.$emit('update:checkout-step', stepNumber)
      this.goToTop()
    },

    enabledCheckoutStep () {
      this.autoMoveStep()
    },

    paymentsListKey: {
      handler () {
        this.paymentGateways = window.ecomPaymentGateways || []
      },
      immediate: true
    }
  },

  created () {
    this.autoMoveStep()
    this.updateZipCode()
    this.ecomCart.on('addItem', () => {
      this.checkoutAppId++
      this.$nextTick(() => {
        window.scroll({
          top: this.$el.offsetTop - 15,
          behavior: 'smooth'
        })
      })
    })
    window.addEventListener('bazicashPrices', () => {
      this.hasBazicashPrices = true
    }, { once: true })
  }
}
