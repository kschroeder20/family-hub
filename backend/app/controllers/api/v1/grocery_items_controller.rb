module Api
  module V1
    class GroceryItemsController < ApplicationController
      include ApiKeyAuthenticatable
      before_action :set_grocery_item, only: [:show, :update, :destroy]

      def index
        grocery_items = GroceryItem.order(purchased: :asc, created_at: :desc)
        render json: grocery_items
      end

      def show
        render json: @grocery_item
      end

      def create
        grocery_item = GroceryItem.new(grocery_item_params)

        if grocery_item.save
          render json: grocery_item, status: :created
        else
          render json: { errors: grocery_item.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @grocery_item.update(grocery_item_params)
          render json: @grocery_item
        else
          render json: { errors: @grocery_item.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @grocery_item.destroy
        head :no_content
      end

      private

      def set_grocery_item
        @grocery_item = GroceryItem.find(params[:id])
      end

      def grocery_item_params
        params.require(:grocery_item).permit(:name, :quantity, :purchased)
      end
    end
  end
end
