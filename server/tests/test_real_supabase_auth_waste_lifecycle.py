import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env')))

from fastapi.testclient import TestClient
from main import app
from app.services.supabase_repository import SupabaseRepository


def test_real_supabase_auth_waste_lifecycle():
    client = TestClient(app)
    repo = SupabaseRepository()

    email = f"tmp_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    payload = {
        "name": "Temp User",
        "email": email,
        "password": password,
        "role": "facility",
        "organization": "Test Org",
    }

    signup = client.post('/api/auth/signup', json=payload)
    print('signup_status', signup.status_code)
    print('signup_body', signup.text[:300])
    assert signup.status_code == 200, signup.text

    fetched = repo.get_user_by_email(email)
    print('supabase_exists_after_signup', bool(fetched), fetched and fetched.get('email'))
    assert fetched and fetched.get('email') == email

    login = client.post('/api/auth/login', json={'email': email, 'password': password})
    print('login_status', login.status_code)
    print('login_body', login.text[:300])
    assert login.status_code == 200, login.text
    token = login.json().get('access_token')
    assert token

    me = client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token})
    print('me_status', me.status_code)
    print('me_body', me.text[:300])
    assert me.status_code == 200, me.text
    assert me.json().get('email') == email

    waste_payload = {
        'category': 'YELLOW',
        'quantity_kg': 5.0,
        'priority': 'Normal',
        'requires_human_verification': False,
        'image_url': '',
        'status': 'Requested'
    }
    create_waste = client.post('/api/waste', json=waste_payload, headers={'Authorization': 'Bearer ' + token})
    print('waste_create_status', create_waste.status_code)
    print('waste_create_body', create_waste.text[:300])
    assert create_waste.status_code == 200, create_waste.text
    created = create_waste.json()
    waste_id = None
    if isinstance(created, dict):
        waste_id = created.get('id')
        if not waste_id and created.get('data'):
            waste_id = created['data'][0].get('id')
    assert waste_id

    get_waste = client.get(f'/api/waste/{waste_id}', headers={'Authorization': 'Bearer ' + token})
    print('waste_get_status', get_waste.status_code)
    print('waste_get_body', get_waste.text[:300])
    assert get_waste.status_code == 200, get_waste.text

    delete_facility = repo.delete_facility_by_user_id(fetched['id'])
    print('delete_facility_status', delete_facility)
    assert delete_facility.get('status') == 'deleted'
    delete_user = repo.delete_user_by_email(email)
    print('delete_user_status', delete_user)
    assert delete_user.get('status') == 'deleted'
    deletion_check = repo.get_user_by_email(email)
    print('supabase_exists_after_delete', bool(deletion_check))
    assert not deletion_check

    delete_waste = repo.delete_waste_record_by_id(waste_id)
    print('delete_waste_status', delete_waste)
    assert delete_waste.get('status') == 'deleted'
    verify_deleted = repo.get_waste_record_by_id(waste_id)
    print('supabase_waste_exists_after_delete', bool(verify_deleted))
    assert not verify_deleted
