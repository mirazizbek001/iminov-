import base64
from datetime import datetime, time, timedelta
from unittest.mock import patch
from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from .models import ModerationReport, PlatformSettings, SocialState, UserBlock, UserPresence, UserRestriction
from .safety import is_service_open, suspected_adult_text


class RegistrationTests(APITestCase):
	def setUp(self):
		super().setUp()
		platform_settings = PlatformSettings.get_solo()
		platform_settings.enabled = True
		platform_settings.open_time = time(0, 0)
		platform_settings.close_time = time(0, 0)
		platform_settings.save(update_fields=['enabled', 'open_time', 'close_time'])

	def test_adult_text_detector_flags_adult_terms_without_flagging_age_references(self):
		self.assertTrue(suspected_adult_text('18+ content'))
		self.assertTrue(suspected_adult_text('Please send nude photos'))
		self.assertFalse(suspected_adult_text('I turned 18 last week'))

	def test_vite_dev_server_is_trusted_for_csrf(self):
		self.assertIn('http://localhost:5173', settings.CSRF_TRUSTED_ORIGINS)
		self.assertIn('http://127.0.0.1:5173', settings.CSRF_TRUSTED_ORIGINS)

	def test_platform_hours_use_tashkent_time_for_aware_and_local_datetimes(self):
		platform_settings = PlatformSettings.get_solo()
		platform_settings.open_time = time(8, 0)
		platform_settings.close_time = time(22, 0)
		platform_settings.save(update_fields=['open_time', 'close_time'])

		utc = timezone.get_fixed_timezone(0)
		self.assertTrue(is_service_open(timezone.make_aware(datetime(2026, 10, 3, 3, 0), utc)))
		self.assertFalse(is_service_open(timezone.make_aware(datetime(2026, 10, 3, 17, 0), utc)))
		self.assertTrue(is_service_open(datetime(2026, 10, 3, 8, 0)))
		self.assertFalse(is_service_open(datetime(2026, 10, 3, 22, 0)))

	def test_overnight_platform_hours_include_after_midnight(self):
		platform_settings = PlatformSettings.get_solo()
		platform_settings.open_time = time(20, 0)
		platform_settings.close_time = time(6, 0)
		platform_settings.save(update_fields=['open_time', 'close_time'])

		self.assertTrue(is_service_open(datetime(2026, 10, 3, 23, 0)))
		self.assertTrue(is_service_open(datetime(2026, 10, 4, 5, 59)))
		self.assertFalse(is_service_open(datetime(2026, 10, 4, 6, 0)))

	def test_global_platform_hours_apply_to_every_user(self):
		first = User.objects.create_user(username='first_user', password='password123')
		second = User.objects.create_user(username='second_user', password='password123')
		for user in (first, second):
			self.client.force_login(user)
			response = self.client.get('/plat/access/')
			self.assertTrue(response.data['open'])
			self.assertEqual(response.data['start'], '00:00')
			self.assertEqual(response.data['end'], '00:00')

	def test_session_endpoint_is_safe_when_logged_out(self):
		response = self.client.get('/plat/session/')
		self.assertEqual(response.status_code, 200)
		self.assertFalse(response.data['authenticated'])

	def test_csrf_endpoint_sets_token_cookie(self):
		response = self.client.get('/plat/csrf/')

		self.assertEqual(response.status_code, 200)
		self.assertIn('csrftoken', response.cookies)

	def test_register_creates_user_with_hashed_password(self):
		response = self.client.post('/plat/register/', {
			'username': 'new_user',
			'email': 'new@example.com',
			'name': 'New User',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		user = User.objects.get(username='new_user')
		self.assertTrue(user.check_password('secret123'))

	def test_register_allows_reusing_email_with_a_different_username(self):
		User.objects.create_user(
			username='first_account',
			email='shared@example.com',
			password='secret123',
		)

		response = self.client.post('/plat/register/', {
			'username': 'second_account',
			'email': 'SHARED@example.com',
			'name': 'Second Account',
			'password': 'secret456',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertTrue(User.objects.filter(username='second_account').exists())
		self.assertEqual(User.objects.filter(email__iexact='shared@example.com').count(), 2)

	def test_register_rejects_duplicate_username(self):
		User.objects.create_user(username='taken', password='secret123')
		response = self.client.post('/plat/register/', {
			'username': 'taken',
			'email': 'taken@example.com',
			'name': 'New User',
			'password': 'different123',
		}, format='json')

		self.assertEqual(response.status_code, 409)

	def test_register_rejects_username_that_only_differs_by_case(self):
		User.objects.create_user(username='Taken', password='secret123')

		response = self.client.post('/plat/register/', {
			'username': 'taken',
			'email': 'different@example.com',
			'name': 'New User',
			'password': 'different123',
		}, format='json')

		self.assertEqual(response.status_code, 409)
		self.assertEqual(response.data['error'], 'Bu username band')

	def test_register_retry_recovers_existing_account(self):
		User.objects.create_user(username='existing', password='secret123')
		response = self.client.post('/plat/register/', {
			'username': 'existing',
			'email': 'existing@example.com',
			'name': 'Existing User',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 200)

	def test_login_accepts_valid_credentials(self):
		User.objects.create_user(username='login_user', password='secret123')
		response = self.client.post('/plat/login/', {
			'username': 'login_user',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['username'], 'login_user')

	def test_staff_admin_can_login_when_platform_is_disabled(self):
		admin = User.objects.create_superuser(username='admin', email='admin@gmail.com', password='iminov')
		platform_settings = PlatformSettings.get_solo()
		platform_settings.enabled = False
		platform_settings.save(update_fields=['enabled'])

		response = self.client.post('/plat/login/', {
			'username': admin.username,
			'password': 'iminov',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['username'], admin.username)
		self.assertTrue(response.data['isAdmin'])
		session_response = self.client.get('/plat/session/')
		self.assertTrue(session_response.data['isAdmin'])
		response = self.client.put('/plat/social/', {'posts': []}, format='json')
		self.assertEqual(response.status_code, 200)

	def test_staff_admin_flag_does_not_depend_on_username(self):
		User.objects.create_superuser(username='root_operator', password='secret123')
		response = self.client.post('/plat/login/', {
			'username': 'root_operator',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['isAdmin'])

	def test_admin_account_cannot_be_registered_when_platform_is_disabled(self):
		platform_settings = PlatformSettings.get_solo()
		platform_settings.enabled = False
		platform_settings.save(update_fields=['enabled'])

		response = self.client.post('/plat/register/', {
			'username': 'admin',
			'email': 'admin@example.com',
			'name': 'Admin',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 403)
		self.assertFalse(User.objects.filter(username='admin').exists())

	def test_admin_username_is_reserved_even_when_platform_is_open(self):
		platform_settings = PlatformSettings.get_solo()
		platform_settings.enabled = True
		platform_settings.open_time = time(0, 0)
		platform_settings.close_time = time(0, 0)
		platform_settings.save(update_fields=['enabled', 'open_time', 'close_time'])

		response = self.client.post('/plat/register/', {
			'username': 'admin',
			'email': 'admin@example.com',
			'name': 'Admin',
			'password': 'secret123',
		}, format='json')

		self.assertEqual(response.status_code, 403)
		self.assertFalse(User.objects.filter(username='admin').exists())

	@override_settings(GOOGLE_CLIENT_ID='test-google-client-id')
	@patch('plat.views._verify_google_token')
	def test_google_login_rejects_admin_email_username(self, mock_verify_google_token):
		mock_verify_google_token.return_value = {
			'aud': 'test-google-client-id',
			'iss': 'accounts.google.com',
			'email_verified': 'true',
			'email': 'Admin@Example.com',
			'name': 'Admin',
			'exp': int(timezone.now().timestamp()) + 300,
		}

		response = self.client.post('/plat/google/', {'credential': 'demo-token'}, format='json')

		self.assertEqual(response.status_code, 403)
		self.assertFalse(User.objects.filter(username='admin').exists())

	def test_saved_admin_hours_are_returned_by_uncached_access_status(self):
		admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='secret123')
		self.client.force_login(admin)
		response = self.client.put('/plat/settings/', {
			'start': '10:30', 'end': '19:45', 'usageLimitMinutes': 30, 'cooldownMinutes': 10,
		}, format='json')

		self.assertEqual(response.status_code, 200)
		response = self.client.get('/plat/access/')
		self.assertEqual(response.data['start'], '10:30')
		self.assertEqual(response.data['end'], '19:45')
		self.assertIn('no-store', response['Cache-Control'])

	def test_login_rejects_invalid_credentials(self):
		User.objects.create_user(username='login_user', password='secret123')
		response = self.client.post('/plat/login/', {
			'username': 'login_user',
			'password': 'wrong-pass',
		}, format='json')

		self.assertEqual(response.status_code, 401)

	def test_users_returns_registered_accounts(self):
		User.objects.create_user(username='visible_user', first_name='Visible')
		response = self.client.get('/plat/users/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data[0]['username'], 'visible_user')
		self.assertNotIn('email', response.data[0])

	def test_admin_users_are_hidden_from_public_user_list(self):
		User.objects.create_user(username='visible_user', first_name='Visible')
		User.objects.create_superuser(username='admin', email='admin@example.com', password='admin123')
		response = self.client.get('/plat/users/')

		self.assertEqual(response.status_code, 200)
		usernames = [user['username'] for user in response.data]
		self.assertNotIn('admin', usernames)
		self.assertIn('visible_user', usernames)

	def test_change_password_updates_password_after_verification(self):
		user = User.objects.create_user(username='password_user', password='oldpass')
		response = self.client.post('/plat/change-password/', {
			'username': 'password_user',
			'current_password': 'oldpass',
			'new_password': 'newpass',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		user.refresh_from_db()
		self.assertTrue(user.check_password('newpass'))

	def test_change_password_rejects_wrong_current_password(self):
		User.objects.create_user(username='password_user', password='oldpass')
		response = self.client.post('/plat/change-password/', {
			'username': 'password_user',
			'current_password': 'wrongpass',
			'new_password': 'newpass',
		}, format='json')

		self.assertEqual(response.status_code, 401)

	def test_social_state_requires_login(self):
		response = self.client.get('/plat/social/')

		self.assertEqual(response.status_code, 403)

	def test_social_feed_returns_non_followed_content_and_hides_blocked_accounts(self):
		viewer = User.objects.create_user(username='viewer', password='password123')
		User.objects.create_user(username='not_followed', password='password123')
		blocked = User.objects.create_user(username='blocked_author', password='password123')
		blocker = User.objects.create_user(username='blocker_author', password='password123')
		UserBlock.objects.create(blocker=viewer, blocked=blocked)
		UserBlock.objects.create(blocker=blocker, blocked=viewer)
		SocialState.objects.create(payload={
			'posts': [
				{'id': 'public-post', 'userId': 'not_followed'},
				{'id': 'blocked-post', 'userId': 'blocked_author'},
				{'id': 'blocker-post', 'userId': 'blocker_author'},
			],
			'reels': [
				{'id': 'public-reel', 'userId': 'not_followed'},
				{'id': 'blocked-reel', 'userId': 'blocked_author'},
				{'id': 'blocker-reel', 'userId': 'blocker_author'},
			],
		})
		self.client.force_login(viewer)

		response = self.client.get('/plat/social/')

		self.assertEqual([item['id'] for item in response.data['posts']], ['public-post'])
		self.assertEqual([item['id'] for item in response.data['reels']], ['public-reel'])
		self.assertEqual(response.data['blockedUsers'], ['blocked_author'])
		self.assertEqual(response.data['blockedByUsers'], ['blocker_author'])

	def test_social_state_saves_and_returns_owner_data_without_other_private_messages(self):
		owner = User.objects.create_user(username='owner', password='password123')
		other = User.objects.create_user(username='other', password='password123')
		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'posts': [{'id': 'p1', 'userId': 'owner'}],
			'messages': [
				{'id': 'm1', 'from': 'owner', 'to': 'other'},
				{'id': 'm2', 'from': 'other', 'to': 'elsewhere'},
			],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		state = SocialState.objects.get(pk=1)
		self.assertEqual(state.payload['posts'], [{'id': 'p1', 'userId': 'owner'}])
		response = self.client.get('/plat/social/')
		self.assertEqual([message['id'] for message in response.data['messages']], ['m1'])

	def test_social_profiles_persist_across_accounts_without_allowing_profile_spoofing(self):
		owner = User.objects.create_user(username='owner', password='password123')
		other = User.objects.create_user(username='other', password='password123')
		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'profiles': {
				'owner': {'name': 'Owner Name', 'bio': 'My bio', 'avatar': None},
			},
		}, format='json')
		self.assertEqual(response.status_code, 200)

		self.client.force_login(other)
		response = self.client.put('/plat/social/', {
			'profiles': {
				'owner': {'name': 'Spoofed Name', 'bio': 'Spoofed', 'avatar': None},
				'other': {'name': 'Other Name', 'bio': '', 'avatar': None},
			},
		}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(
			SocialState.objects.get(pk=1).payload['profiles']['owner']['name'],
			'Owner Name',
		)
		self.assertEqual(
			self.client.get('/plat/social/').data['profiles']['owner']['bio'],
			'My bio',
		)

	def test_social_state_keeps_other_posts_and_merges_only_current_users_interactions(self):
		owner = User.objects.create_user(username='owner', password='password123')
		self.client.force_login(owner)
		SocialState.objects.create(payload={'posts': [
			{'id': 'other-post', 'userId': 'other', 'likes': [], 'comments': []},
			{'id': 'owner-post', 'userId': 'owner', 'likes': [], 'comments': []},
		]})
		response = self.client.put('/plat/social/', {
			'posts': [{
				'id': 'other-post', 'userId': 'other', 'likes': ['owner'],
				'comments': [{'id': 'comment-1', 'userId': 'owner', 'text': 'Nice'}],
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		posts = {post['id']: post for post in SocialState.objects.get(pk=1).payload['posts']}
		self.assertNotIn('owner-post', posts)
		self.assertEqual(posts['other-post']['likes'], ['owner'])
		self.assertEqual(posts['other-post']['comments'][0]['userId'], 'owner')

	def test_reel_comments_merge_for_other_users_reel_and_are_returned(self):
		commenter = User.objects.create_user(username='commenter', password='password123')
		User.objects.create_user(username='reel_owner', password='password123')
		self.client.force_login(commenter)
		SocialState.objects.create(payload={'reels': [
			{'id': 'r1', 'userId': 'reel_owner', 'likes': [], 'comments': [{'id': 'c0', 'userId': 'reel_owner', 'text': 'Salom'}]},
		]})
		response = self.client.put('/plat/social/', {
			'reels': [{
				'id': 'r1', 'userId': 'reel_owner', 'likes': [],
				'comments': [{'id': 'c1', 'userId': 'commenter', 'text': 'Zo\u2018r video'}],
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		response = self.client.get('/plat/social/')
		reel = next(item for item in response.data['reels'] if item['id'] == 'r1')
		self.assertEqual({comment['id'] for comment in reel['comments']}, {'c0', 'c1'})

	def test_reel_comment_too_long_is_rejected(self):
		commenter = User.objects.create_user(username='long_commenter', password='password123')
		self.client.force_login(commenter)
		SocialState.objects.create(payload={'reels': [{'id': 'r1', 'userId': 'someone', 'likes': [], 'comments': []}]})
		response = self.client.put('/plat/social/', {
			'reels': [{'id': 'r1', 'userId': 'someone', 'likes': [], 'comments': [{'id': 'c1', 'userId': 'long_commenter', 'text': 'a' * 501}]}],
		}, format='json')

		self.assertEqual(response.status_code, 400)

	def test_message_read_flag_never_goes_back_to_unread(self):
		sender = User.objects.create_user(username='msg_sender', password='password123')
		reader = User.objects.create_user(username='msg_reader', password='password123')
		SocialState.objects.create(payload={'messages': [
			{'id': 'm1', 'from': 'msg_sender', 'to': 'msg_reader', 'text': 'hi', 'read': True},
		]})
		self.client.force_login(reader)
		# eski (kech kelgan) so'rov: read=False yuboradi
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'm1', 'from': 'msg_sender', 'to': 'msg_reader', 'text': 'hi', 'read': False}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		message = SocialState.objects.get(pk=1).payload['messages'][0]
		self.assertTrue(message['read'])

	def test_social_state_returns_seen_stories_only_for_current_viewer(self):
		viewer = User.objects.create_user(username='viewer', password='password123')
		self.client.force_login(viewer)
		SocialState.objects.create(payload={'seenStories': [
			{'viewerId': 'viewer', 'storyId': 'story-1'},
			{'viewerId': 'another', 'storyId': 'story-2'},
		]})

		response = self.client.get('/plat/social/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['seenStories'], [{'viewerId': 'viewer', 'storyId': 'story-1'}])

	def test_owner_can_upload_and_retrieve_a_story(self):
		owner = User.objects.create_user(username='story_uploader', password='password123')
		self.client.force_login(owner)
		image = base64.b64encode(b'\x89PNG\r\n\x1a\n').decode('ascii')
		story = {
			'id': 'uploaded-story',
			'userId': owner.username,
			'media': f'data:image/png;base64,{image}',
			'type': 'image',
			'caption': 'Salom',
			'likes': [],
		}

		response = self.client.put('/plat/social/', {'stories': [story]}, format='json')

		self.assertEqual(response.status_code, 200)
		response = self.client.get('/plat/social/')
		self.assertEqual(response.data['stories'], [story])

	def test_story_like_and_view_are_visible_to_owner_and_survive_owner_sync(self):
		owner = User.objects.create_user(username='story_owner', password='password123')
		viewer = User.objects.create_user(username='story_viewer', password='password123')
		SocialState.objects.create(payload={'stories': [
			{'id': 'story-1', 'userId': 'story_owner', 'likes': [], 'comments': []},
		], 'seenStories': []})

		self.client.force_login(viewer)
		response = self.client.put('/plat/social/', {
			'stories': [{'id': 'story-1', 'userId': 'story_owner', 'likes': ['story_viewer'], 'comments': []}],
			'seenStories': [{'viewerId': 'story_viewer', 'storyId': 'story-1'}],
		}, format='json')
		self.assertEqual(response.status_code, 200)

		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'stories': [{'id': 'story-1', 'userId': 'story_owner', 'likes': [], 'comments': []}],
			'seenStories': [],
		}, format='json')
		self.assertEqual(response.status_code, 200)

		response = self.client.get('/plat/social/')
		self.assertEqual(response.data['stories'][0]['likes'], ['story_viewer'])
		self.assertEqual(response.data['seenStories'], [{'viewerId': 'story_viewer', 'storyId': 'story-1'}])

	def test_message_edit_and_delete_permissions(self):
		sender = User.objects.create_user(username='sender', password='password123')
		receiver = User.objects.create_user(username='receiver', password='password123')
		SocialState.objects.create(payload={'messages': [
			{'id': 'message-1', 'from': 'sender', 'to': 'receiver', 'text': 'old', 'hiddenFor': []},
		], 'deletedMessages': []})

		self.client.force_login(sender)
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'message-1', 'from': 'sender', 'to': 'receiver', 'text': 'edited', 'edited': True}],
		}, format='json')
		self.assertEqual(response.status_code, 200)

		self.client.force_login(receiver)
		response = self.client.get('/plat/social/')
		self.assertEqual(response.data['messages'][0]['text'], 'edited')
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'message-1', 'from': 'sender', 'to': 'receiver', 'text': 'edited', 'edited': True, 'hiddenFor': ['receiver']}],
		}, format='json')
		self.assertEqual(response.status_code, 200)

		response = self.client.put('/plat/social/', {
			'deletedMessages': [{'id': 'message-1', 'from': 'sender', 'to': 'receiver'}],
		}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['saved'], True)
		self.assertFalse(SocialState.objects.get(pk=1).payload.get('deletedMessages'))

		self.client.force_login(sender)
		self.client.put('/plat/social/', {
			'deletedMessages': [{'id': 'message-1', 'from': 'sender', 'to': 'receiver'}],
		}, format='json')
		self.client.force_login(receiver)
		response = self.client.get('/plat/social/')
		self.assertEqual(response.data['messages'], [])

	def test_recipient_read_receipt_is_persisted_for_sender(self):
		sender = User.objects.create_user(username='read_sender', password='password123')
		receiver = User.objects.create_user(username='read_receiver', password='password123')
		SocialState.objects.create(payload={'messages': [
			{'id': 'read-message', 'from': sender.username, 'to': receiver.username, 'text': 'Hello', 'read': False},
		]})

		self.client.force_login(receiver)
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'read-message', 'from': sender.username, 'to': receiver.username, 'text': 'Hello', 'read': True}],
		}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(SocialState.objects.get(pk=1).payload['messages'][0]['read'])

		self.client.force_login(sender)
		response = self.client.get('/plat/social/')
		self.assertTrue(response.data['messages'][0]['read'])
		self.assertIn('no-store', response['Cache-Control'])

	def test_reel_video_larger_than_default_request_limit_can_be_published(self):
		owner = User.objects.create_user(username='large_reel_creator', password='password123')
		self.client.force_login(owner)
		video = base64.b64encode(b'\x00\x00\x00\x18ftypmp42' + b'\x00' * (3 * 1024 * 1024)).decode()
		response = self.client.put('/plat/social/', {
			'reels': [{
				'id': 'large-reel', 'userId': owner.username,
				'media': f'data:video/mp4;base64,{video}', 'caption': 'Test reel', 'likes': [], 'comments': [],
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(SocialState.objects.get(pk=1).payload['reels'][0]['id'], 'large-reel')

	def test_adult_post_is_rejected_without_admin_review(self):
		owner = User.objects.create_user(username='creator', password='password123')
		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'posts': [{'id': 'adult-post', 'userId': 'creator', 'caption': '18+ content', 'likes': [], 'comments': []}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [])
		self.assertEqual(response.data['rejectedMedia'], [{'type': 'post', 'id': 'adult-post'}])
		self.assertFalse(SocialState.objects.get(pk=1).payload.get('posts'))
		self.assertFalse(ModerationReport.objects.filter(content_id='adult-post').exists())

	def test_adult_message_is_held_and_moderation_queue_is_admin_only(self):
		sender = User.objects.create_user(username='sender', password='password123')
		User.objects.create_user(username='receiver', password='password123')
		self.client.force_login(sender)
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'adult-message', 'from': 'sender', 'to': 'receiver', 'text': 'send nude photos'}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [{'type': 'message', 'id': 'adult-message'}])
		self.assertFalse(SocialState.objects.get(pk=1).payload.get('messages'))
		self.assertEqual(self.client.get('/plat/moderation/').status_code, 403)

	def test_chat_video_is_delivered_to_recipient_without_admin_review(self):
		sender = User.objects.create_user(username='sender', password='password123')
		receiver = User.objects.create_user(username='receiver', password='password123')
		admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
		video_data = 'data:video/webm;base64,GkXfo4GB'
		self.client.force_login(sender)
		response = self.client.put('/plat/social/', {
			'messages': [{
				'id': 'chat-video', 'from': 'sender', 'to': 'receiver', 'text': 'Hello',
				'src': video_data, 'mediaType': 'video',
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [])
		self.assertEqual(SocialState.objects.get(pk=1).payload['messages'][0]['to'], receiver.username)
		self.client.force_login(receiver)
		self.assertEqual(self.client.get('/plat/social/').data['messages'][0]['src'], video_data)
		self.client.force_login(admin)
		self.assertEqual(self.client.get('/plat/moderation/').data, [])

	def test_chat_images_are_delivered_and_adult_text_is_removed_not_queued(self):
		sender = User.objects.create_user(username='image_sender', password='password123')
		receiver = User.objects.create_user(username='image_receiver', password='password123')
		image_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jg5kAAAAASUVORK5CYII='
		self.client.force_login(sender)
		response = self.client.put('/plat/social/', {
			'messages': [
				{'id': 'plain-image', 'from': sender.username, 'to': receiver.username, 'src': image_data, 'mediaType': 'image'},
				{'id': 'image-with-flagged-text', 'from': sender.username, 'to': receiver.username, 'src': image_data, 'mediaType': 'image', 'text': '18+ content'},
			],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [])
		self.assertEqual(response.data['sanitizedMessages'], ['image-with-flagged-text'])
		self.client.force_login(receiver)
		received = {message['id']: message for message in self.client.get('/plat/social/').data['messages']}
		self.assertEqual(received['plain-image']['src'], image_data)
		self.assertEqual(received['image-with-flagged-text']['src'], image_data)
		self.assertEqual(received['image-with-flagged-text']['text'], '')

	def test_fast_social_actions_deliver_follow_and_message_updates(self):
		sender = User.objects.create_user(username='fast_sender', password='password123')
		receiver = User.objects.create_user(username='fast_receiver', password='password123')
		self.client.force_login(sender)
		response = self.client.post('/plat/social/fast/', {'action': 'follow', 'username': receiver.username}, format='json')
		self.assertEqual(response.status_code, 200)

		response = self.client.post('/plat/social/fast/', {
			'action': 'message',
			'message': {'id': 'fast-message', 'to': receiver.username, 'text': 'Salom', 't': 123},
		}, format='json')
		self.assertEqual(response.status_code, 200)

		self.client.force_login(receiver)
		response = self.client.get('/plat/social/updates/?since=0')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['messages'][0]['id'], 'fast-message')
		self.assertIn({'a': sender.username, 'b': receiver.username}, response.data['follows'])
		self.assertEqual(response.data['notifs'][0]['type'], 'follow')
		self.assertIn('no-store', response['Cache-Control'])

		response = self.client.post('/plat/social/fast/', {'action': 'read', 'from': sender.username}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(SocialState.objects.get(pk=1).payload['messages'][0]['read'])

		response = self.client.post('/plat/social/fast/', {'action': 'read-notifs'}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(SocialState.objects.get(pk=1).payload['notifs'][0]['read'])

	def test_message_reaction_syncs_without_returning_message_media(self):
		reactor = User.objects.create_user(username='reactor', password='password123')
		sender = User.objects.create_user(username='reaction_sender', password='password123')
		image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jg5kAAAAASUVORK5CYII='
		SocialState.objects.create(payload={'messages': [{
			'id': 'react-message', 'from': sender.username, 'to': reactor.username,
			'src': image, 'mediaType': 'image', 't': 100, 'read': True,
		}]})
		self.client.force_login(reactor)
		response = self.client.post('/plat/social/fast/', {
			'action': 'react', 'messageId': 'react-message', 'emoji': '❤️',
		}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['reactions'], {reactor.username: '❤️'})

		updates = self.client.get('/plat/social/updates/?since=1000')
		self.assertEqual(updates.data['messages'], [])
		self.assertEqual(updates.data['messageReactions'], [
			{'id': 'react-message', 'reactions': {reactor.username: '❤️'}},
		])
		response = self.client.post('/plat/social/fast/', {
			'action': 'react', 'messageId': 'react-message', 'emoji': '❤️',
		}, format='json')
		self.assertEqual(response.data['reactions'], {})
		self.assertEqual(self.client.get('/plat/social/updates/?since=1000').data['messageReactions'], [
			{'id': 'react-message', 'reactions': {}},
		])

	def test_measured_voice_duration_replaces_inflated_metadata(self):
		listener = User.objects.create_user(username='duration_listener', password='password123')
		sender = User.objects.create_user(username='duration_sender', password='password123')
		SocialState.objects.create(payload={'messages': [{
			'id': 'duration-message', 'from': sender.username, 'to': listener.username,
			'mediaType': 'audio', 'mediaDuration': 208, 'src': 'data:audio/webm;base64,GkXfo4GB', 't': 1,
		}]})
		self.client.force_login(listener)
		response = self.client.post('/plat/social/fast/', {
			'action': 'voice-duration', 'messageId': 'duration-message', 'duration': 3,
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(SocialState.objects.get(pk=1).payload['messages'][0]['mediaDuration'], 3)
		self.assertEqual(self.client.get('/plat/social/updates/?since=0').data['voiceDurations'], [
			{'id': 'duration-message', 'duration': 3},
		])

	def test_call_log_is_delivered_into_chat_history(self):
		caller = User.objects.create_user(username='call_caller', password='password123')
		receiver = User.objects.create_user(username='call_receiver', password='password123')
		self.client.force_login(caller)
		response = self.client.post('/plat/social/fast/', {
			'action': 'call-log',
			'message': {
				'id': 'call-log-1', 'to': receiver.username, 'text': '', 't': 123,
				'callEvent': {'mode': 'video', 'status': 'ended', 'duration': 42},
			},
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.client.force_login(receiver)
		message = self.client.get('/plat/social/').data['messages'][0]
		self.assertEqual(message['callEvent']['mode'], 'video')
		self.assertEqual(message['callEvent']['status'], 'ended')
		self.assertEqual(message['callEvent']['duration'], 42)

	def test_voice_message_is_delivered_to_recipient_without_admin_review(self):
		sender = User.objects.create_user(username='voice_sender', password='password123')
		receiver = User.objects.create_user(username='voice_receiver', password='password123')
		admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
		audio_data = 'data:audio/webm;codecs=opus;base64,GkXfo4GB'
		self.client.force_login(sender)
		response = self.client.put('/plat/social/', {
			'messages': [{
				'id': 'voice-message', 'from': 'voice_sender', 'to': 'voice_receiver',
				'src': audio_data, 'mediaType': 'audio',
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [])
		self.client.force_login(receiver)
		self.assertEqual(self.client.get('/plat/social/').data['messages'][0]['src'], audio_data)
		self.client.force_login(admin)
		self.assertEqual(self.client.get('/plat/moderation/').data, [])

	def test_blocked_users_cannot_send_messages_to_each_other(self):
		blocker = User.objects.create_user(username='blocker', password='password123')
		blocked = User.objects.create_user(username='blocked', password='password123')
		User.objects.create_user(username='other', password='password123')
		SocialState.objects.create(payload={'follows': [
			{'a': 'blocker', 'b': 'blocked'},
			{'a': 'blocked', 'b': 'blocker'},
			{'a': 'blocked', 'b': 'other'},
			{'a': 'other', 'b': 'blocker'},
		]})
		self.client.force_login(blocker)
		response = self.client.post('/plat/users/blocked/block/')
		self.assertEqual(response.status_code, 200)
		follows = SocialState.objects.get(pk=1).payload['follows']
		self.assertEqual(len(follows), 2)
		self.assertFalse(any(follow['a'] == 'blocker' and follow['b'] == 'blocked' for follow in follows))
		self.assertFalse(any(follow['a'] == 'blocked' and follow['b'] == 'blocker' for follow in follows))
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'blocked-send-1', 'from': 'blocker', 'to': 'blocked', 'text': 'Hello'}],
		}, format='json')
		self.assertEqual(response.data['blockedMessages'], ['blocked-send-1'])
		self.assertEqual(self.client.get('/plat/social/').data['blockedUsers'], ['blocked'])

		self.client.force_login(blocked)
		blocked_state = self.client.get('/plat/social/').data
		self.assertEqual(blocked_state['blockedByUsers'], ['blocker'])
		self.assertFalse(any('blocker' in (follow['a'], follow['b']) for follow in blocked_state['follows']))
		response = self.client.put('/plat/social/', {
			'messages': [{'id': 'blocked-send-2', 'from': 'blocked', 'to': 'blocker', 'text': 'Hello'}],
		}, format='json')
		self.assertEqual(response.data['blockedMessages'], ['blocked-send-2'])
		self.assertFalse(SocialState.objects.get(pk=1).payload.get('messages'))

		self.client.force_login(blocker)
		response = self.client.delete('/plat/users/blocked/block/')
		self.assertEqual(response.status_code, 200)
		self.assertFalse(self.client.get('/plat/social/').data['blockedUsers'])

	def test_delete_chat_hides_only_old_messages_for_requesting_user(self):
		owner = User.objects.create_user(username='chat_owner', password='password123')
		peer = User.objects.create_user(username='chat_peer', password='password123')
		SocialState.objects.create(payload={'messages': [
			{'id': 'old-message', 'from': 'chat_owner', 'to': 'chat_peer', 'text': 'Old', 't': 1000},
			{'id': 'future-old-message', 'from': 'chat_peer', 'to': 'chat_owner', 'text': 'Clock ahead', 't': 9999999999999},
		], 'deletedMessages': []})
		self.client.force_login(owner)
		response = self.client.delete('/plat/chats/chat_peer/')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(self.client.get('/plat/social/').data['messages'], [])

		self.client.force_login(peer)
		self.assertEqual({item['id'] for item in self.client.get('/plat/social/').data['messages']}, {'old-message', 'future-old-message'})
		self.client.force_login(owner)
		self.client.put('/plat/social/', {
			'messages': [{'id': 'new-message', 'from': 'chat_owner', 'to': 'chat_peer', 'text': 'New', 't': response.data['cutoff'] + 1}],
		}, format='json')
		self.assertEqual([item['id'] for item in self.client.get('/plat/social/').data['messages']], ['new-message'])

	def test_call_signals_are_delivered_once_and_limited_to_participants(self):
		caller = User.objects.create_user(username='caller', password='password123')
		callee = User.objects.create_user(username='callee', password='password123')
		outsider = User.objects.create_user(username='outsider', password='password123')
		self.client.force_login(caller)
		response = self.client.post('/plat/calls/signals/', {
			'callId': 'call-123', 'to': 'callee', 'action': 'invite', 'payload': {'mode': 'video'},
		}, format='json')
		self.assertEqual(response.status_code, 201)

		self.client.force_login(callee)
		response = self.client.get('/plat/calls/signals/')
		self.assertEqual(response.data[0]['action'], 'invite')
		self.assertEqual(self.client.get('/plat/calls/signals/').data, [])
		response = self.client.post('/plat/calls/signals/', {
			'callId': 'call-123', 'to': 'caller', 'action': 'accept', 'payload': {},
		}, format='json')
		self.assertEqual(response.status_code, 201)

		self.client.force_login(outsider)
		response = self.client.post('/plat/calls/signals/', {
			'callId': 'call-123', 'to': 'callee', 'action': 'offer', 'payload': {},
		}, format='json')
		self.assertEqual(response.status_code, 404)

		UserBlock.objects.create(blocker=caller, blocked=callee)
		self.client.force_login(caller)
		response = self.client.post('/plat/calls/signals/', {
			'callId': 'call-blocked', 'to': 'callee', 'action': 'invite', 'payload': {'mode': 'audio'},
		}, format='json')
		self.assertEqual(response.status_code, 403)

	def test_presence_endpoint_reports_recently_active_users(self):
		first = User.objects.create_user(username='presence_one', password='password123')
		second = User.objects.create_user(username='presence_two', password='password123')
		User.objects.create_user(username='not_in_chat', password='password123')
		SocialState.objects.create(payload={'messages': [
			{'id': 'presence-chat', 'from': 'presence_one', 'to': 'presence_two', 'text': 'Hi'},
		]})
		self.client.force_login(first)
		first_status = self.client.get('/plat/presence/').data['users']
		self.assertEqual(first_status, [{'username': 'presence_two', 'online': False, 'lastSeen': None}])

		self.client.force_login(second)
		self.assertTrue(self.client.get('/plat/presence/').data['users'][0]['online'])
		self.client.force_login(first)
		self.assertTrue(self.client.get('/plat/presence/').data['users'][0]['online'])
		UserPresence.objects.filter(user=second).update(last_seen=timezone.now() - timedelta(minutes=2))
		offline_status = self.client.get('/plat/presence/').data['users'][0]
		self.assertFalse(offline_status['online'])
		self.assertIsNotNone(offline_status['lastSeen'])
		self.assertEqual(UserPresence.objects.count(), 2)

	def test_new_image_post_is_published_without_admin_review(self):
		owner = User.objects.create_user(username='creator', password='password123')
		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'posts': [{
				'id': 'image-post', 'userId': 'creator',
				'image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jg5kAAAAASUVORK5CYII=',
				'caption': 'My photo', 'likes': [], 'comments': [],
			}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['moderation'], [])
		self.assertIn('data:image/png', SocialState.objects.get(pk=1).payload['posts'][0]['image'])
		self.assertFalse(ModerationReport.objects.filter(content_id='image-post').exists())

	def test_admin_can_restrict_media_uploader_and_server_blocks_actions(self):
		owner = User.objects.create_user(username='creator', password='password123')
		admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
		User.objects.create_user(username='receiver', password='password123')
		self.client.force_login(owner)
		response = self.client.put('/plat/social/', {
			'reels': [{
				'id': 'review-reel', 'userId': 'creator', 'media': 'data:video/webm;base64,GkXfo4GB',
				'caption': 'Trip', 'likes': [],
			}],
		}, format='json')
		self.assertEqual(response.status_code, 200)
		self.client.force_login(User.objects.get(username='receiver'))
		response = self.client.post('/plat/reels/review-reel/report/', {'reason': 'other'}, format='json')
		self.assertEqual(response.status_code, 201)
		report = ModerationReport.objects.get(content_type='reel_report', content_id='review-reel')
		self.client.force_login(admin)
		response = self.client.post(f'/plat/moderation/{report.id}/', {'action': 'restrict', 'days': 3}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(ModerationReport.objects.get(pk=report.id).status, ModerationReport.RESTRICTED)
		restriction = UserRestriction.objects.get(user=owner)
		self.assertGreater(restriction.restricted_until.timestamp() - timezone.now().timestamp(), 71 * 60 * 60)

		self.client.force_login(owner)
		response = self.client.get('/plat/access/')
		self.assertTrue(response.data['restriction']['active'])
		state = SocialState.objects.get(pk=1)
		state.payload.update({
			'posts': [{'id': 'other-post', 'userId': 'receiver', 'likes': [], 'comments': []}],
			'follows': [], 'messages': [],
		})
		state.save(update_fields=['payload', 'updated_at'])
		response = self.client.put('/plat/social/', {
			'posts': [{'id': 'other-post', 'userId': 'receiver', 'likes': ['creator'], 'comments': []}],
			'follows': [{'a': 'creator', 'b': 'receiver'}],
			'messages': [{'id': 'blocked-message', 'from': 'creator', 'to': 'receiver', 'text': 'Hello'}],
		}, format='json')

		self.assertEqual(response.status_code, 200)
		state.refresh_from_db()
		self.assertEqual(state.payload['posts'][0]['likes'], [])
		self.assertEqual(state.payload['follows'], [])
		self.assertEqual(state.payload['messages'], [])

	def test_reel_report_is_sent_to_admin_and_can_remove_reel(self):
		owner = User.objects.create_user(username='reel_owner', password='password123')
		reporter = User.objects.create_user(username='reporter', password='password123')
		admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
		SocialState.objects.create(payload={'reels': [{
			'id': 'reported-reel', 'userId': owner.username, 'media': 'data:video/webm;base64,GkXfo4GB',
			'caption': 'Video', 'likes': [],
		}]})
		self.client.force_login(reporter)
		response = self.client.post('/plat/reels/reported-reel/report/', {
			'reason': 'other', 'details': 'Tekshirib ko‘ring',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		report = ModerationReport.objects.get(content_type='reel_report')
		self.assertEqual(report.content['reportReason'], 'other')
		self.assertEqual(report.content['reportedBy'], reporter.username)
		self.assertEqual(self.client.post('/plat/reels/reported-reel/report/', {'reason': 'adult'}, format='json').status_code, 409)

		self.client.force_login(admin)
		response = self.client.get('/plat/moderation/')
		self.assertEqual(response.data[0]['content']['reportDetails'], 'Tekshirib ko‘ring')
		response = self.client.post(f'/plat/moderation/{report.id}/', {'action': 'reject'}, format='json')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(SocialState.objects.get(pk=1).payload['reels'], [])


class SafetyFilterTests(TestCase):
	def test_blocks_insults_adult_words_and_leetspeak(self):
		from .safety import blocked_text
		for text in ('s3xy rasm', 'Bu 18+ video', 'ahmoq', 'a h m o q', 'сука', 'yalang\'och', 'https://example.com'):
			self.assertTrue(blocked_text(text), text)

	def test_allows_normal_text(self):
		from .safety import blocked_text
		for text in ('Salom, qalaysan?', 'skill', 'classic', 'Kitob o\'qidim', 'Men 18 yoshdaman'):
			self.assertFalse(blocked_text(text), text)


class UsernameChangeTests(APITestCase):
	def setUp(self):
		super().setUp()
		platform_settings = PlatformSettings.get_solo()
		platform_settings.enabled = True
		platform_settings.open_time = time(0, 0)
		platform_settings.close_time = time(0, 0)
		platform_settings.save(update_fields=['enabled', 'open_time', 'close_time'])
		self.user = User.objects.create_user(username='ali', password='pass1234', first_name='Ali')
		SocialState.objects.create(pk=1, payload={'posts': [{'id': 'p1', 'userId': 'ali', 'caption': 'ali', 'likes': ['ali'], 'comments': []}], 'profiles': {'ali': {'name': 'Ali'}}})

	def test_username_change_rewrites_social_state(self):
		self.client.force_login(self.user)
		response = self.client.post('/plat/change-username/', {'username': 'ali_new'}, format='json')
		self.assertEqual(response.status_code, 200)
		payload = SocialState.objects.get(pk=1).payload
		self.assertEqual(payload['posts'][0]['userId'], 'ali_new')
		self.assertEqual(payload['posts'][0]['caption'], 'ali')
		self.assertIn('ali_new', payload['profiles'])

	def test_rejects_taken_and_bad_usernames(self):
		User.objects.create_user(username='vali', password='pass1234')
		self.client.force_login(self.user)
		self.assertEqual(self.client.post('/plat/change-username/', {'username': 'vali'}, format='json').status_code, 409)
		self.assertEqual(self.client.post('/plat/change-username/', {'username': 'sexy'}, format='json').status_code, 400)
		self.assertEqual(self.client.post('/plat/change-username/', {'username': 'a b'}, format='json').status_code, 400)
