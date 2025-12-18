module Api
  module V1
    class RecurringChoresController < ApplicationController
      include ApiKeyAuthenticatable
      before_action :set_recurring_chore, only: [:show, :update, :destroy, :complete]

      def index
        recurring_chores = RecurringChore.active
                                        .includes(:family_member, :completions)
                                        .order(next_due_date: :asc, created_at: :desc)

        render json: recurring_chores.as_json(
          include: {
            family_member: { only: [:id, :name, :color] }
          },
          methods: [:overdue_severity, :recurrence_description]
        )
      end

      def show
        render json: @recurring_chore.as_json(
          include: {
            family_member: { only: [:id, :name, :color] },
            completions: {
              only: [:id, :completed_at, :was_due_at],
              include: { family_member: { only: [:id, :name] } }
            }
          },
          methods: [:overdue_severity, :recurrence_description]
        )
      end

      def create
        recurring_chore = RecurringChore.new(recurring_chore_params)

        if recurring_chore.save
          render json: recurring_chore.as_json(
            include: { family_member: { only: [:id, :name, :color] } },
            methods: [:overdue_severity, :recurrence_description]
          ), status: :created
        else
          render json: { errors: recurring_chore.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        if @recurring_chore.update(recurring_chore_params)
          render json: @recurring_chore.as_json(
            include: { family_member: { only: [:id, :name, :color] } },
            methods: [:overdue_severity, :recurrence_description]
          )
        else
          render json: { errors: @recurring_chore.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @recurring_chore.update(active: false)  # Soft delete
        head :no_content
      end

      def complete
        completed_by_id = params[:completed_by_id] || @recurring_chore.family_member_id
        completed_by = completed_by_id ? FamilyMember.find(completed_by_id) : nil

        @recurring_chore.mark_complete!(completed_by: completed_by)

        render json: @recurring_chore.as_json(
          include: { family_member: { only: [:id, :name, :color] } },
          methods: [:overdue_severity, :recurrence_description]
        )
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def set_recurring_chore
        @recurring_chore = RecurringChore.find(params[:id])
      end

      def recurring_chore_params
        params.require(:recurring_chore).permit(
          :title,
          :description,
          :family_member_id,
          :recurrence_type,
          :recurrence_interval,
          :day_of_month,
          :active,
          days_of_week: []
        )
      end
    end
  end
end
