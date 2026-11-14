# Local fixture only. Never load in a deployed application.
raise 'synthetic database only' unless Rails.env.test? && ActiveRecord::Base.connection_db_config.database.in?(%w[evo_l_test evo_l_ui_test]) && ENV['POSTGRES_HOST'] == '127.0.0.1' && ENV['REDIS_URL'] == 'redis://127.0.0.1:56389'
require 'puma'
$velma = ConnectionPool.new(size: 2) { Redis::Namespace.new('velma', redis: Redis.new(url: ENV.fetch('REDIS_URL'))) }
ActiveJob::Base.queue_adapter = :test
actor = User.find_or_create_by!(email: 'l6-ui@example.invalid') { |u| u.name = 'Admin sintético L6' }
pipeline = Pipeline.find_or_create_by!(name: 'Pipeline sintética L6') { |p| p.created_by = actor }
pipeline.pipeline_stages.find_or_create_by!(name: 'Novo lead') { |s| s.position = 1 }
Label.first || Label.create!(title: 'aquisicao-sintetica', color: '#3867d6')
Api::BaseController.class_eval do
  define_method(:authenticate_request!) do
    Current.user = actor
    Current.evo_role_key = 'administrator'
    Current.evo_permission_cache = {}
    Current.service_authenticated = true
  end
end
unless Channel::Whatsapp.exists?(phone_number: '+15550000606')
  Channel::Whatsapp.insert!({ id: SecureRandom.uuid, phone_number: '+15550000606', provider: 'evolution', provider_config: { instance_name: 'sintetica-l6', existing_instance_attached: true, attachment_state: 'active', attachment_started_at: Time.current.to_i }, created_at: Time.current, updated_at: Time.current })
end
channel = Channel::Whatsapp.find_by!(phone_number: '+15550000606')
Inbox.find_or_create_by!(channel: channel) { |i| i.name = 'Caixa sintética L6' }
rails_app = Rails.application
# Stand-in for the separate Auth service, only its synthetic user directory.
app = lambda do |env|
  if env['PATH_INFO'] == '/api/v1/users'
    [200, { 'content-type' => 'application/json', 'access-control-allow-origin' => 'http://127.0.0.1:5176', 'access-control-allow-credentials' => 'true' }, [JSON.generate({ success: true, data: [{ id: actor.id, name: actor.name }], meta: { pagination: { total_pages: 1 } } })]]
  else
    rails_app.call(env)
  end
end
server = Puma::Server.new(app)
server.add_tcp_listener('127.0.0.1', 3016)
puts 'L6 synthetic Rails ready on loopback 3016'
server.run.join
