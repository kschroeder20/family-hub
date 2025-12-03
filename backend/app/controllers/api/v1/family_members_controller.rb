module Api
  module V1
    class FamilyMembersController < ApplicationController
      def index
        family_members = FamilyMember.all
        render json: family_members
      end
    end
  end
end
