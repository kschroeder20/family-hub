module Api
  module V1
    class ChoresController < ApplicationController
      before_action :set_chore, only: [:show, :update, :destroy]

      def index
        chores = Chore.includes(:family_member).order(due_date: :asc, created_at: :desc)
        render json: chores.as_json(include: { family_member: { only: [:id, :name, :color] } })
      end

      def show
        render json: @chore.as_json(include: { family_member: { only: [:id, :name, :color] } })
      end

      def create
        chore = Chore.new(chore_params)

        if chore.save
          render json: chore.as_json(include: { family_member: { only: [:id, :name, :color] } }), status: :created
        else
          render json: { errors: chore.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @chore.update(chore_params)
          render json: @chore.as_json(include: { family_member: { only: [:id, :name, :color] } })
        else
          render json: { errors: @chore.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @chore.destroy
        head :no_content
      end

      private

      def set_chore
        @chore = Chore.find(params[:id])
      end

      def chore_params
        params.require(:chore).permit(:title, :description, :family_member_id, :due_date, :completed)
      end
    end
  end
end
