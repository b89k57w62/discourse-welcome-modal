import Component from "@glimmer/component";

import DModal from "discourse/components/d-modal";
import DButton from "discourse/components/d-button";

import { ajax } from "discourse/lib/ajax";

import I18n from "discourse-i18n";

import { fn } from "@ember/helper";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";

import {
  purgeLegacyState,
  resolveModalState,
} from "../lib/welcome-modal-visibility";

const FORCE_PARAM = "show-welcome-modal";
const FORCE_VALUE = "true";
const USER_TYPE_PARAM = "user-type";
const DEFAULT_CARD_LAYOUT = "grid";
const EXTERNAL_URL_PATTERN = /^https?:\/\//i;
const ALLOWED_PROTOCOLS = ["http:", "https:"];

export default class WelcomeModal extends Component {
    @tracked visible = false;
    @tracked cards = [];
    @service currentUser;
    @service router;

    constructor() {
        super(...arguments);
        purgeLegacyState(window.localStorage);
        this.determineVisibility();
    }

    async determineVisibility() {
        const params = new URLSearchParams(window.location.search);
        const forced = params.get(FORCE_PARAM) === FORCE_VALUE;
        const enabled = Boolean(settings?.enabled);
        const needsUserDetails = Boolean(this.currentUser) && (enabled || forced);

        const state = resolveModalState({
            enabled,
            registeredAt: needsUserDetails ? await this.fetchRegisteredAt() : null,
            featureEnabledDate: settings?.feature_enabled_date,
            cards: settings?.card_content,
            forced,
            userTypeOverride: params.get(USER_TYPE_PARAM),
        });

        this.cards = state.cards;
        this.visible = state.visible;
    }

    async fetchRegisteredAt() {
        try {
            const details = await ajax(`/u/${this.currentUser.username}.json`);
            return details?.user?.created_at ?? null;
        } catch (error) {
            console.error("Welcome Modal: failed to load user details:", error);
            return null;
        }
    }

    get modalTitle() {
        return I18n.t(themePrefix("discourse_welcome_modal.title"));
    }

    get modalCloseBtn() {
        return I18n.t(themePrefix("discourse_welcome_modal.close_btn"));
    }

    get cardLayout() {
        return settings?.card_layout || DEFAULT_CARD_LAYOUT;
    }

    @action
    dismissModal() {
        this.visible = false;
    }

    @action
    handleCardAction(card) {
        const destination = card?.action;

        if (typeof destination !== "string" || !destination.trim()) {
            console.warn("Welcome Modal: Invalid action for card:", card?.id);
            return;
        }

        const sanitizedDestination = destination.trim();

        try {
            if (EXTERNAL_URL_PATTERN.test(sanitizedDestination)) {
                const url = new URL(sanitizedDestination);

                if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
                    console.warn(
                        "Welcome Modal: Unsafe URL protocol detected:",
                        url.protocol
                    );
                    return;
                }

                window.open(sanitizedDestination, "_blank", "noopener,noreferrer");
            } else {
                this.router.transitionTo(sanitizedDestination);
            }
        } catch (error) {
            console.error("Welcome Modal: Error handling card action:", error);
        } finally {
            this.dismissModal();
        }
    }

    <template>
        {{#if this.visible}}
            <DModal
                @title={{this.modalTitle}}
                @closeModal={{this.dismissModal}}
                class="welcome-modal"
            >
                <:body>
                    <div class="welcome-modal-cards {{this.cardLayout}}-layout">
                        {{#each this.cards as |card|}}
                            <article class="card" aria-labelledby="card-title-{{card.id}}">
                                {{#if card.imgUrl}}
                                    <img
                                        src={{card.imgUrl}}
                                        alt={{card.altText}}
                                        loading="lazy"
                                    />
                                {{/if}}
                                <div class="card-content">
                                    <h3 id="card-title-{{card.id}}">{{card.title}}</h3>
                                    <p>{{card.subtitle}}</p>
                                </div>
                                <DButton
                                    @action={{fn this.handleCardAction card}}
                                    @translatedLabel={{card.btnLabel}}
                                    class="btn btn-primary welcome-modal-cta"
                                    aria-describedby="card-title-{{card.id}}"
                                />
                            </article>
                        {{/each}}
                    </div>
                </:body>
                <:footer>
                    <div class="welcome-modal-footer">
                        <DButton
                            @translatedLabel={{this.modalCloseBtn}}
                            @action={{this.dismissModal}}
                            class="btn-danger welcome-modal-close"
                        />
                    </div>
                </:footer>
            </DModal>
        {{/if}}
    </template>
}
