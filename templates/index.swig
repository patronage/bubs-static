{% extends 'layouts/_base.swig' %}

{% block content %}
    <h1>{{ home.page_title }}</h1>
    {% if home.hero.image %}
        <img src="{{ home.hero.image }}">
    {% endif %}
{% endblock %}
