raise 'synthetic database only' unless Rails.env.test? && ActiveRecord::Base.connection_db_config.database == 'evo_l_ui_test' && ENV['POSTGRES_HOST'] == '127.0.0.1'
ActiveJob::Base.queue_adapter = :test
rule = LeadAutomationRule.find_by!(name: 'Novos leads · Ensaio local L6')
event = LeadAutomationEvent.find_by!(source_key: "intake:#{rule.id}:#{ENV.fetch('L6_EVENT_ID')}")
LeadAutomations::ProcessEvent.call(event.id)
run = rule.runs.find_by!(event_id: event.id)
raise 'deal was not created' unless run.status == 'created' && PipelineItem.exists?(run.deal_id)
raise 'duplicate deal' unless PipelineItem.where(contact_id: event.contact_id, pipeline_id: rule.pipeline_id).count == 1
raise 'duplicate run' unless rule.runs.where(contact_id: event.contact_id).count == 1
raise 'unexpected conversation' unless event.conversation_id.nil?
puts JSON.generate({ status: run.status, deals_for_contact: PipelineItem.where(contact_id: event.contact_id, pipeline_id: rule.pipeline_id).count, conversations: Conversation.where(contact_id: event.contact_id).count })
