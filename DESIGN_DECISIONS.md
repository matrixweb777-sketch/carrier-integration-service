# Design Decisions

The goal of this project was to build a carrier integration layer
that can support multiple shipping providers over time.

UPS logic is isolated behind a carrier interface so new carriers
can be added without changing the core services.

Authentication is implemented in a token manager to make it reusable
for future UPS operations like label purchase or tracking.

## Future Improvements

- Add support for additional carriers like FedEx or DHL.
- Implement shipment creation and tracking endpoints.
- Introduce caching for rate responses if needed.